import Link from "next/link"
import { ArrowLeft, FileSpreadsheet } from "lucide-react"
import { OnboardingRequirementsTable } from "@/components/admin/onboarding-requirements-table"

export const dynamic = "force-dynamic"

export default function OnboardingRequirementsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Link
                        href="/admin/users"
                        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-blue mb-3"
                    >
                        <ArrowLeft className="h-3 w-3" />
                        Back to vetting queue
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                            <FileSpreadsheet className="h-6 w-6 text-purple-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Onboarding Requirements</h1>
                            <p className="text-slate-500 max-w-2xl">
                                The list of documents every new client must provide. Drag to reorder, attach a fillable template (Credit Application, T&Cs etc.) or just define a slot for a user-supplied document.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-6">
                <OnboardingRequirementsTable />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <h3 className="text-sm font-bold text-white mb-2">How this works</h3>
                <ul className="space-y-1.5 text-xs text-slate-400 leading-relaxed">
                    <li>• <strong className="text-slate-300">User-supplied document</strong> — admin defines the slot (e.g. &ldquo;Tax Clearance Certificate&rdquo;); the user uploads their own file.</li>
                    <li>• <strong className="text-slate-300">Fillable template</strong> — admin uploads the file once (e.g. Credit Application); the verification email links to it; the user downloads, fills in, and uploads their completed version back into the same slot.</li>
                    <li>• Reordering reflects in the order the user sees on the onboarding form.</li>
                    <li>• Hiding (Hide button) stops new applications from seeing it; existing uploads referencing the requirement keep their original label.</li>
                </ul>
            </div>
        </div>
    )
}
