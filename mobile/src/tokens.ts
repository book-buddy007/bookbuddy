/**
 * Mobile re-export of the CANONICAL design tokens.
 *
 * The single source of truth lives at repo-level shared/design/tokens.ts and is
 * shared with the web app. This file only re-exports it so existing mobile
 * imports (`@/tokens`, `./tokens`) keep working. Do NOT define token values here.
 */
export * from '@shared/design/tokens';
