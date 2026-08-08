# Contratos de la API HTTP de Biblioteca

| Método | Endpoint | Propósito | Estado Éxito | Estado Error |
|---|---|---|---|---|
| GET | `/api/health` | Estado del servidor | 200 OK | 500 |
| GET | `/api/books` | Listar todos los libros / Filtrar | 200 OK | 400, 500 |
| GET | `/api/books/:id` | Consultar libro por ID | 200 OK | 400, 404, 500 |
| POST | `/api/books` | Crear un nuevo libro | 201 Created | 400, 500 |
| PATCH | `/api/books/:id` | Actualización parcial | 200 OK | 400, 404, 500 |
| DELETE | `/api/books/:id` | Eliminar un libro | 204 No Content | 400, 404, 500 |