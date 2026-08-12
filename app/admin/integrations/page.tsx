import { IntegrationsConsole } from "@/components/admin/integrations-console"
import { Plug } from "lucide-react"

export default function IntegrationsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Plug className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Integrations</h1>
                    <p className="text-slate-500">
                        Configure, test, and enable external services. Credentials are encrypted at rest and never sent to the browser.
                    </p>
                </div>
            </div>

            <IntegrationsConsole />
        </div>
    )
}
