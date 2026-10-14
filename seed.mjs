const apiBase = (process.env.API_BASE_URL ?? "http://localhost:8000/api/v1").replace(/\/+$/, "");
const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

if (!username || !password) {
  throw new Error("Defina ADMIN_USERNAME y ADMIN_PASSWORD en el entorno; no use credenciales incorporadas al script.");
}

async function request(path, { token, body, method = "GET" } = {}) {
  let response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    throw new Error(`No se pudo conectar con la API en ${apiBase}: ${error.message}`);
  }

  if (response.status === 204) return undefined;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${method} ${path} respondió HTTP ${response.status}: ${payload?.message ?? "respuesta no válida"}`);
  }
  return payload;
}

const login = await request("/auth/login", {
  method: "POST",
  body: { username, password },
});
const token = login.access_token;
const categories = await request("/categories", { token });
const categoryByName = new Map(categories.map((category) => [category.name, category.id]));

const booksToSeed = [
  { title: "El jardín de las ideas", author: "Mariana Solís", isbn: "9786073810011", category: "Novela", total_copies: 3 },
  { title: "Ciencia para todos", author: "Andrés Vega", isbn: "9786073810028", category: "Ciencia", total_copies: 3 },
  { title: "Mundos conectados", author: "Lucía Torres", isbn: "9786073810035", category: "Tecnología", total_copies: 3 },
  { title: "Voces de nuestra historia", author: "Daniel Ríos", isbn: "9786073810042", category: "Historia", total_copies: 3 },
  { title: "Pequeños universos", author: "Elena Pardo", isbn: "9786073810059", category: "Infantil", total_copies: 3 },
];

const membersToSeed = [
  { full_name: "Sofía Martínez (demo)", document_number: "DEMO-ML-0001" },
  { full_name: "Mateo Herrera (demo)", document_number: "DEMO-ML-0002" },
  { full_name: "Valentina Cruz (demo)", document_number: "DEMO-ML-0003" },
];

async function findBook(title) {
  const result = await request(`/books?q=${encodeURIComponent(title)}&size=50`, { token });
  return result.items.find((book) => book.title === title);
}

async function findMember(documentNumber) {
  const result = await request(`/members?q=${encodeURIComponent(documentNumber)}&size=50`, { token });
  return result.items.find((member) => member.document_number === documentNumber);
}

async function hasLoanForBook(memberId, bookId) {
  let page = 1;
  let found = false;
  let total = 0;

  do {
    const result = await request(
      `/loans?member_id=${encodeURIComponent(memberId)}&page=${page}&size=50`,
      { token },
    );
    total = result.total;
    found ||= result.items.some((loan) =>
      loan.member_id === memberId && loan.items.some((item) => item.book_id === bookId),
    );
    page += 1;
  } while (!found && (page - 1) * 50 < total);

  return found;
}

const books = [];
for (const book of booksToSeed) {
  const categoryId = categoryByName.get(book.category);
  if (!categoryId) throw new Error(`La API no contiene la categoría establecida "${book.category}".`);

  const existing = await findBook(book.title);
  books.push(existing ?? await request("/books", {
    token,
    method: "POST",
    body: {
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category_id: categoryId,
      total_copies: book.total_copies,
    },
  }));
}

const members = [];
for (const member of membersToSeed) {
  members.push(await findMember(member.document_number) ?? await request("/members", {
    token,
    method: "POST",
    body: member,
  }));
}

const loansCreated = [];
for (let index = 0; index < members.length; index += 1) {
  const member = members[index];
  const book = books[index];
  const alreadySeeded = await hasLoanForBook(member.id, book.id);
  if (alreadySeeded) continue;

  loansCreated.push(await request("/loans", {
    token,
    method: "POST",
    body: { member_id: member.id, items: [{ book_id: book.id }] },
  }));
}

console.log(`Datos de demostración listos: ${books.length} libros, ${members.length} socios y ${loansCreated.length} préstamos nuevos.`);
console.log("No se crean préstamos vencidos: el contrato fija su vencimiento 14 días después de crearlos y no permite cambiarlo.");
