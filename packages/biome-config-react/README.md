# @moritzbrantner/biome-config-react

Shared Biome configuration for React projects.

## Usage

Install the package together with `@biomejs/biome`, then extend it from your project-level `biome.json` or `biome.jsonc`:

```json
{
  "extends": ["@moritzbrantner/biome-config-react/biome"]
}
```

Keep project-specific file includes, ignores, and overrides in the consuming project's Biome config.
