// Public API for the shared UI kit (FSD `shared/ui` segment).
// shadcn adds components as individual files here; re-export them so the rest
// of the app imports from `@/shared/ui` instead of reaching into files.
export { Button, buttonVariants } from "./button";
export { Input } from "./input";
export { Label } from "./label";
export { Separator } from "./separator";
export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
} from "./field";
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "./card";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";
export { Switch } from "./switch";
export { Toaster } from "./sonner";
export { Toggle, toggleVariants } from "./toggle";
export { ToggleGroup, ToggleGroupItem } from "./toggle-group";

export {  Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"
export { TimePicker } from "./timepicker"
export { Calendar } from "./calendar"
