# Add Shadcn UI Component

This project uses @shadcn/ui for beautiful, accessible UI components that can be customized.

## Installed Components Location

Components are available in `src/components/ui` (per `components.json` alias configuration).

## Usage

Import components using the configured `@/` alias:

```tsx
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
```

Example usage:

```tsx
<Button variant="outline">Click me</Button>

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card Content</p>
  </CardContent>
  <CardFooter>
    <p>Card Footer</p>
  </CardFooter>
</Card>
```

## Installing New Components

Many components are available but not installed. See full list at https://ui.shadcn.com/

To install a new component:

```bash
npx shadcn@latest add [component-name]
```

Example (install accordion):

```bash
npx shadcn@latest add accordion
```

**Important:** Use `npx shadcn@latest` (NOT `npx shadcn-ui@latest` - that's deprecated)

## Popular Components

- Accordion, Alert, AlertDialog
- Avatar, Calendar, Checkbox
- Collapsible, Command, ContextMenu
- DataTable, DatePicker, Dropdown Menu
- Form, Hover Card, Menubar
- Navigation Menu, Popover, Progress
- Radio Group, ScrollArea, Select
- Separator, Sheet, Skeleton
- Slider, Switch, Table, Textarea
- Sonner (toast notifications)
- Toggle, Tooltip

## Styling Configuration

This project uses:
- Style variant: "new-york"
- Base color: "neutral"
- CSS variables for theming (per `components.json`)

## Action

If the user wants to add a component, run the `npx shadcn@latest add [component-name]` command, then confirm installation and show usage examples.
