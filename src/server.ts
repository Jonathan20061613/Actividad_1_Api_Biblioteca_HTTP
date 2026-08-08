import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";

interface Book {
    id: number;
    title: string;
    author: string;
    publicationYear: number;
    available: boolean;
}

const PORT = Number(process.env.PORT ?? 3000);

// Base de datos en memoria
const books: Book[] = [
    {
        id: 1,
        title: "Clean Code",
        author: "Robert C. Martin",
        publicationYear: 2008,
        available: true,
    },
    {
        id: 2,
        title: "The Pragmatic Programmer",
        author: "Andrew Hunt y David Thomas",
        publicationYear: 1999,
        available: false,
    },
];

let nextId = 3; // Contador para IDs únicos

// Función auxiliar para enviar respuestas JSON
function sendJson(response: ServerResponse, statusCode: number, payload?: unknown): void {
    if (statusCode === 204) {
        response.writeHead(204);
        response.end();
        return;
    }
    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(payload));
}

// Función auxiliar para leer y parsear el body JSON sin usar 'any'
async function readJsonBody(request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (chunks.length === 0) {
        return undefined;
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

// Servidor nativo de Node.js
const server = createServer(async (request, response) => {
    try {
        const method = request.method ?? "GET";
        const requestUrl = new URL(
            request.url ?? "/",
            `http://${request.headers.host ?? "localhost"}`
        );
        const pathname = requestUrl.pathname;
        const searchParams = requestUrl.searchParams;

        // 1. GET /api/health
        if (method === "GET" && pathname === "/api/health") {
            sendJson(response, 200, {
                status: "ok",
                booksInMemory: books.length,
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // 2. GET /api/books (Listado y Filtros)
        if (method === "GET" && pathname === "/api/books") {
            let result = [...books];

            const authorFilter = searchParams.get("author");
            if (authorFilter !== null) {
                const cleanAuthor = authorFilter.toLowerCase();
                result = result.filter((b) => b.author.toLowerCase().includes(cleanAuthor));
            }

            const availableFilter = searchParams.get("available");
            if (availableFilter !== null) {
                if (availableFilter !== "true" && availableFilter !== "false") {
                    sendJson(response, 400, {
                        error: "BAD_REQUEST",
                        message: "El filtro 'available' solo acepta los valores 'true' o 'false'",
                    });
                    return;
                }
                const isAvailable = availableFilter === "true";
                result = result.filter((b) => b.available === isAvailable);
            }

            sendJson(response, 200, {
                data: result,
                total: result.length,
            });
            return;
        }

        // Rutas dinámicas por ID (/api/books/:id)
        const bookIdMatch = pathname.match(/^\/api\/books\/([^/]+)$/);

        if (bookIdMatch) {
            const idRaw = bookIdMatch[1] ?? "";
            const bookId = Number(idRaw);

            // Validar que sea un entero positivo
            if (!Number.isInteger(bookId) || bookId <= 0 || isNaN(bookId) || !/^\d+$/.test(idRaw)) {
                sendJson(response, 400, {
                    error: "BAD_REQUEST",
                    message: "El identificador 'bookId' debe ser un número entero positivo válido",
                });
                return;
            }

            const bookIndex = books.findIndex((b) => b.id === bookId);

            // GET /api/books/:id
            if (method === "GET") {
                if (bookIndex === -1) {
                    sendJson(response, 404, {
                        error: "BOOK_NOT_FOUND",
                        message: `No existe un libro con el identificador ${bookId}`,
                    });
                    return;
                }
                sendJson(response, 200, { data: books[bookIndex] });
                return;
            }

            // PATCH /api/books/:id
            if (method === "PATCH") {
                if (bookIndex === -1) {
                    sendJson(response, 404, {
                        error: "BOOK_NOT_FOUND",
                        message: `No existe un libro con el identificador ${bookId}`,
                    });
                    return;
                }

                const body = await readJsonBody(request);

                if (!body || typeof body !== "object" || Array.isArray(body)) {
                    sendJson(response, 400, {
                        error: "BAD_REQUEST",
                        message: "El body debe ser un objeto JSON válido",
                    });
                    return;
                }

                const payload = body as Record<string, unknown>;
                const keys = Object.keys(payload);

                if (keys.length === 0) {
                    sendJson(response, 400, {
                        error: "BAD_REQUEST",
                        message: "Debe enviar al menos un campo para actualizar",
                    });
                    return;
                }

                if ("id" in payload) {
                    sendJson(response, 400, {
                        error: "BAD_REQUEST",
                        message: "No está permitido modificar el identificador del libro",
                    });
                    return;
                }

                const allowedKeys = ["title", "author", "publicationYear", "available"];
                const invalidKeys = keys.filter((k) => !allowedKeys.includes(k));
                if (invalidKeys.length > 0) {
                    sendJson(response, 400, {
                        error: "BAD_REQUEST",
                        message: `Propiedades no permitidas: ${invalidKeys.join(", ")}`,
                    });
                    return;
                }

                const targetBook = books[bookIndex]!;

                if (payload.title !== undefined) {
                    if (typeof payload.title !== "string" || payload.title.trim() === "") {
                        sendJson(response, 400, {
                            error: "BAD_REQUEST",
                            message: "El campo 'title' no puede estar vacío",
                        });
                        return;
                    }
                    targetBook.title = payload.title.trim();
                }

                if (payload.author !== undefined) {
                    if (typeof payload.author !== "string" || payload.author.trim() === "") {
                        sendJson(response, 400, {
                            error: "BAD_REQUEST",
                            message: "El campo 'author' no puede estar vacío",
                        });
                        return;
                    }
                    targetBook.author = payload.author.trim();
                }

                if (payload.publicationYear !== undefined) {
                    const currentYear = new Date().getFullYear();
                    if (
                        typeof payload.publicationYear !== "number" ||
                        !Number.isInteger(payload.publicationYear) ||
                        payload.publicationYear < 1450 ||
                        payload.publicationYear > currentYear
                    ) {
                        sendJson(response, 400, {
                            error: "BAD_REQUEST",
                            message: `El campo 'publicationYear' debe ser un entero entre 1450 y ${currentYear}`,
                        });
                        return;
                    }
                    targetBook.publicationYear = payload.publicationYear;
                }

                if (payload.available !== undefined) {
                    if (typeof payload.available !== "boolean") {
                        sendJson(response, 400, {
                            error: "BAD_REQUEST",
                            message: "El campo 'available' debe ser un valor booleano",
                        });
                        return;
                    }
                    targetBook.available = payload.available;
                }

                sendJson(response, 200, { data: targetBook });
                return;
            }

            // DELETE /api/books/:id
            if (method === "DELETE") {
                if (bookIndex === -1) {
                    sendJson(response, 404, {
                        error: "BOOK_NOT_FOUND",
                        message: `No existe un libro con el identificador ${bookId}`,
                    });
                    return;
                }

                books.splice(bookIndex, 1);
                sendJson(response, 204);
                return;
            }
        }

        // 3. POST /api/books
        if (method === "POST" && pathname === "/api/books") {
            const body = await readJsonBody(request);

            if (!body || typeof body !== "object" || Array.isArray(body)) {
                sendJson(response, 400, {
                    error: "BAD_REQUEST",
                    message: "El body debe ser un objeto JSON válido",
                });
                return;
            }

            const payload = body as Record<string, unknown>;

            if ("id" in payload) {
                sendJson(response, 400, {
                    error: "BAD_REQUEST",
                    message: "No debe enviar el campo 'id', el servidor lo genera automáticamente",
                });
                return;
            }

            const { title, author, publicationYear, available } = payload;

            if (typeof title !== "string" || title.trim() === "") {
                sendJson(response, 400, {
                    error: "BAD_REQUEST",
                    message: "El campo 'title' es obligatorio y debe ser un texto no vacío",
                });
                return;
            }

            if (typeof author !== "string" || author.trim() === "") {
                sendJson(response, 400, {
                    error: "BAD_REQUEST",
                    message: "El campo 'author' es obligatorio y debe ser un texto no vacío",
                });
                return;
            }

            const currentYear = new Date().getFullYear();
            if (
                typeof publicationYear !== "number" ||
                !Number.isInteger(publicationYear) ||
                publicationYear < 1450 ||
                publicationYear > currentYear
            ) {
                sendJson(response, 400, {
                    error: "BAD_REQUEST",
                    message: `El campo 'publicationYear' es obligatorio y debe ser un entero entre 1450 y ${currentYear}`,
                });
                return;
            }

            if (typeof available !== "boolean") {
                sendJson(response, 400, {
                    error: "BAD_REQUEST",
                    message: "El campo 'available' es obligatorio y debe ser booleano",
                });
                return;
            }

            const newBook: Book = {
                id: nextId++,
                title: title.trim(),
                author: author.trim(),
                publicationYear,
                available,
            };

            books.push(newBook);
            sendJson(response, 201, { data: newBook });
            return;
        }

        // Ruta desconocida (404)
        sendJson(response, 404, {
            error: "ROUTE_NOT_FOUND",
            message: "La ruta solicitada no existe",
            method,
            path: pathname,
        });
    } catch (error: unknown) {
        if (error instanceof SyntaxError) {
            sendJson(response, 400, {
                error: "INVALID_JSON",
                message: "El body contiene un JSON inválido",
            });
            return;
        }

        console.error("Error inesperado:", error);
        sendJson(response, 500, {
            error: "INTERNAL_SERVER_ERROR",
            message: "Ocurrió un error interno en el servidor",
        });
    }
});

server.listen(PORT, () => {
    console.log(`Servidor disponible en http://localhost:${PORT}`);
});