// content/*.md files are imported as strings (next.config.mjs).
declare module "*.md" {
  const text: string;
  export default text;
}
