import { loadCatalog } from "./catalog-client.js";
// Production builds fail closed on data errors; never republish the legacy catalog silently.
const catalog = await loadCatalog();
export const { products, categories, categoryGroups } = catalog;
