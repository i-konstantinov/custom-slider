# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Freshly generated Angular CLI 22 app (single project, `custom-slider`). `src/app/app.html` is still the CLI placeholder template and `app.routes.ts` is empty; the custom slider itself hasn't been built yet. The placeholder test in `src/app/app.spec.ts` asserts on the placeholder `<h1>`, so update or remove it when the template is replaced.

## Commands

- `npm start` (`ng serve`): dev server at http://localhost:4200, development config by default
- `npm run build` (`ng build`): production build into `dist/` with budgets enforced (initial bundle warns at 500kB and errors at 1MB; per-component styles warn at 4kB and error at 8kB)
- `npm run watch`: development build in watch mode
- `npm test` (`ng test`): unit tests with Vitest in jsdom, through the `@angular/build:unit-test` builder
  - Run one spec file: `ng test --include src/app/app.spec.ts`
  - Run tests matching a name: `ng test --filter "should render title"`
  - Run once without watching: `ng test --watch=false`
- `ng generate component <name>`: scaffold a component (defaults to SCSS, `app` selector prefix)

No linter is configured. Formatting is done with Prettier (`npx prettier --write .`): 100-column width, single quotes, and the `angular` parser for HTML templates.

## Architecture and conventions

- Standalone bootstrap with no NgModules: `src/main.ts` calls `bootstrapApplication(App, appConfig)`, and app-wide providers go in `src/app/app.config.ts`.
- Zoneless: `zone.js` isn't installed, so change detection depends on signals and other Angular-scheduled notifications. Hold component state in `signal`/`computed`, not in plain mutable fields.
- Components follow the CLI 22 naming: files are `name.ts`, `name.html`, `name.scss` and `name.spec.ts` (no `.component` suffix), and classes are named without a `Component` suffix (for example `App`).
- Templates use the built-in control flow (`@for`, `@if`).
- Strict TS/Angular compiler options are on (`strictInjectionParameters`, `strictInputAccessModifiers`, `noPropertyAccessFromIndexSignature`, `noImplicitOverride`). Global styles live in `src/styles.scss`, and static assets are served from `public/`.

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

## Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- Do NOT import `CommonModule`, import only the directives and pipes the template uses, such as `AsyncPipe` or `DatePipe`
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection