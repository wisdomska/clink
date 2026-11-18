import { startReporting } from "@/lib/report";

// Error reporting loads once the app is up (see lib/report), never inside
// After Dark or admin.
startReporting();
