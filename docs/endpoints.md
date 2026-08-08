<div align="center">

# API Biblioteca HTTP
### Documentación Técnica de Endpoints

![Status](https://img.shields.io/badge/status-activo-brightgreen)
![API](https://img.shields.io/badge/API-REST-blue)
![Format](https://img.shields.io/badge/formato-JSON-orange)

Contratos de entrada/salida, validaciones en runtime y códigos de estado HTTP para la gestión de libros en memoria.

</div>

---

## Resumen de Endpoints

| Método | Endpoint | Descripción | Éxito | Errores |
|:------:|----------|-------------|:-----:|---------|
| `GET` | `/api/health` | Estado del servidor y conteo de libros | `200` | `500` |
| `GET` | `/api/books` | Consultar catálogo (con filtros) | `200` | `400` `500` |
| `GET` | `/api/books/:id` | Consultar un libro por ID | `200` | `400` `404` `500` |
| `POST` | `/api/books` | Registrar un nuevo libro | `201` | `400` `500` |
| `PATCH` | `/api/books/:id` | Actualizar libro (parcial) | `200` | `400` `404` `500` |
| `DELETE` | `/api/books/:id` | Eliminar un libro | `204` | `400` `404` `500` |

---

## 1. Verificación de Estado

```
GET /api/health
```

Comprueba que el servidor está activo y retorna el tiempo de actividad junto con el total de libros en memoria.

**Parámetros:** Ninguno

<details>
<summary><b>Respuesta exitosa — <code>200 OK</code></b></summary>

```json
{
  "status": "ok",
  "booksInMemory": 2,
  "timestamp": "2026-08-08T19:52:57.677Z"
}
```

</details>

---

## 2. Listar y Filtrar Libros

```
GET /api/books
```

Retorna la lista completa de libros o los filtrados según los parámetros de consulta enviados.

**Query Parameters (opcionales):**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `author` | `string` | Búsqueda parcial, insensible a mayúsculas/minúsculas |
| `available` | `boolean` | Filtra por disponibilidad (`true` / `false`) |

**Ejemplos:**
```
GET /api/books
GET /api/books?author=martin
GET /api/books?available=true
```

<details>
<summary><b>Respuesta exitosa — <code>200 OK</code></b></summary>

```json
{
  "data": [
    {
      "id": 1,
      "title": "Clean Code",
      "author": "Robert C. Martin",
      "publicationYear": 2008,
      "available": true
    }
  ],
  "total": 1
}
```

</details>

> **Evidencia de ejecución:** 
>
> ![Evidencia GET /api/books](../evidencias/01-get-books.png)

---

## 3. Obtener Libro por ID

```
GET /api/books/:id
```

Devuelve la información de un libro específico utilizando su identificador numérico.

**Path Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | `integer` | Identificador único del libro |

<details>
<summary><b>Respuesta exitosa — <code>200 OK</code></b></summary>

```json
{
  "data": {
    "id": 1,
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "publicationYear": 2008,
    "available": true
  }
}
```

</details>

<details>
<summary><b><code>400 Bad Request</code> — ID inválido o no numérico</b></summary>

```json
{
  "error": "INVALID_ID",
  "message": "El ID del libro debe ser un número entero válido"
}
```

</details>

<details>
<summary><b><code>404 Not Found</code> — Libro no encontrado</b></summary>

```json
{
  "error": "BOOK_NOT_FOUND",
  "message": "No se encontró ningún libro con el ID 999"
}
```

</details>

> **Evidencia de ejecución:**
>
> ![Evidencia GET /api/books/:id](../evidencias/02-get-book-not-found.png)

---

## 4. Crear un Libro

```
POST /api/books
```

Agrega un nuevo libro a la colección en memoria.

**Headers requeridos:** `Content-Type: application/json`

**Cuerpo de la petición:**

```json
{
  "title": "Refactoring",
  "author": "Martin Fowler",
  "publicationYear": 1999,
  "available": true
}
```

**Reglas de validación (runtime):**

| Campo | Regla |
|-------|-------|
| `title` | Cadena de texto obligatoria (no vacía) |
| `author` | Cadena de texto obligatoria (no vacía) |
| `publicationYear` | Entero obligatorio (entre 1450 y el año actual) |
| `available` | Booleano opcional (por defecto `true`) |
| `id` | Prohibido en el body (se asigna autoincrementalmente) |

<details>
<summary><b>Respuesta exitosa — <code>201 Created</code></b></summary>

```json
{
  "data": {
    "id": 3,
    "title": "Refactoring",
    "author": "Martin Fowler",
    "publicationYear": 1999,
    "available": true
  }
}
```

</details>

<details>
<summary><b><code>400 Bad Request</code> — Validación fallida</b></summary>

```json
{
  "error": "VALIDATION_ERROR",
  "message": "El título y autor son obligatorios y deben ser cadenas de texto no vacías"
}
```

</details>

> **Evidencia de ejecución:** *(Captura en PowerShell creando un nuevo libro con respuesta 201 Created)*
>
> ![Evidencia POST /api/books](../evidencias/03-post-book.png)

---

## 5. Actualización Parcial

```
PATCH /api/books/:id
```

Modifica uno o más atributos de un libro existente en el catálogo.

**Path Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | `integer` | ID del libro a modificar |

**Cuerpo de la petición:**

```json
{
  "available": false
}
```

<details>
<summary><b>Respuesta exitosa — <code>200 OK</code></b></summary>

```json
{
  "data": {
    "id": 1,
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "publicationYear": 2008,
    "available": false
  }
}
```

</details>

**Errores posibles:**
- `400 Bad Request` — Body vacío o tipos inválidos
- `404 Not Found` — Libro no encontrado

---

## 6. Eliminar un Libro

```
DELETE /api/books/:id
```

Elimina del catálogo en memoria el libro correspondiente al ID proporcionado.

**Path Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | `integer` | ID del libro a eliminar |

**Respuesta exitosa — `204 No Content`**
*(Sin cuerpo de respuesta)*

**Errores posibles:**
- `400 Bad Request` — ID no válido
- `404 Not Found` — El libro no existe o ya fue eliminado

> **Evidencia de ejecución:** *(Captura en PowerShell mostrando el código de estado 204 y el posterior 404)*
>
> ![Evidencia DELETE /api/books/:id](../evidencias/04-delete-book.png)

---

<div align="center">

**Fin de la documentación de endpoints**

</div>