// Datos estáticos del local: mesas y carta de ejemplo.
// Es la única fuente de datos iniciales; `seed:run` los carga en Convex.

export const TABLE_COUNT = 12;

export type SeedOption = { name: string; choices: string[] };

export type SeedProduct = {
  name: string;
  description: string;
  price: number; // CLP, sin decimales
  available?: boolean;
  options?: SeedOption[];
};

export type SeedCategory = { name: string; products: SeedProduct[] };

const punto: SeedOption = { name: "Punto de la carne", choices: ["Jugoso", "A punto", "Bien cocido"] };

export const MENU: SeedCategory[] = [
  {
    name: "Entradas",
    products: [
      { name: "Empanadas de queso (3)", description: "Fritas, con pebre de la casa.", price: 5900 },
      { name: "Ceviche de reineta", description: "Reineta marinada en limón, cebolla morada, cilantro y ají.", price: 8900 },
      { name: "Machas a la parmesana", description: "Seis machas gratinadas con queso parmesano y vino blanco.", price: 10900 },
    ],
  },
  {
    name: "Fondos",
    products: [
      {
        name: "Lomo a lo pobre",
        description: "Lomo liso con papas fritas, cebolla caramelizada y dos huevos.",
        price: 14900,
        options: [punto],
      },
      {
        name: "Hamburguesa de la casa",
        description: "200 g de carne, queso cheddar, tocino y salsa de la casa. Con papas.",
        price: 11900,
        options: [punto, { name: "Pan", choices: ["Brioche", "Integral"] }],
      },
      { name: "Pastel de choclo", description: "Receta tradicional, horneado en greda.", price: 10500 },
      {
        name: "Salmón a la plancha",
        description: "Con agregado a elección.",
        price: 13900,
        options: [{ name: "Agregado", choices: ["Puré rústico", "Arroz", "Ensalada chilena"] }],
      },
      { name: "Risotto de hongos", description: "Hongos de temporada, parmesano y aceite de trufa. Vegetariano.", price: 12500 },
    ],
  },
  {
    name: "Bebidas",
    products: [
      {
        name: "Bebida en lata",
        description: "350 ml.",
        price: 2200,
        options: [{ name: "Sabor", choices: ["Coca-Cola", "Coca-Cola Zero", "Sprite", "Fanta"] }],
      },
      {
        name: "Jugo natural",
        description: "500 ml.",
        price: 3500,
        options: [{ name: "Sabor", choices: ["Frambuesa", "Mango", "Piña", "Naranja"] }],
      },
      { name: "Pisco sour", description: "Pisco, limón de pica, jarabe y clara.", price: 4900 },
      { name: "Copa de vino tinto", description: "Carménère, Valle del Colchagua.", price: 4500 },
      { name: "Agua mineral", description: "500 ml, con o sin gas.", price: 1900, available: false },
    ],
  },
  {
    name: "Postres",
    products: [
      { name: "Leche asada", description: "Con caramelo casero.", price: 3900 },
      { name: "Mote con huesillo", description: "Clásico de verano.", price: 3500 },
      { name: "Brownie con helado", description: "Brownie tibio con helado de vainilla.", price: 4900 },
    ],
  },
];
