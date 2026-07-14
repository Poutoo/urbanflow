/** Email unique par exécution — évite les collisions "email déjà utilisé" entre deux runs. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 100000)}@urbanflow-e2e.test`
}
