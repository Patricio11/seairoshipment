import { AlertTriangle, FileText, Info, ShieldAlert } from "lucide-react"

export const TERMS_VERSION = "2.0"
export const TERMS_EFFECTIVE_LABEL = "Effective as of the date of booking confirmation"

/**
 * Single source of truth for the Seairo SRS Terms & Conditions content.
 *
 * Used by:
 *   - /terms page (public, indexable)
 *   - <TermsModal> rendered from the booking wizard step 3
 *   - signup acknowledgement link
 *   - verification email link (link only — body lives here)
 *
 * To update wording: bump TERMS_VERSION, edit the SECTIONS array, redeploy.
 * Past bookings remain bound to the version that was active at booking time —
 * we don't render historical versions; that's a future concern.
 */

interface Definition {
    term: string
    def: string
}

interface Callout {
    tone: "info" | "warning" | "danger" | "rate"
    title: string
    body: string
}

type Block =
    | { type: "p"; text: string }
    | { type: "ol"; items: string[] }
    | { type: "definitions"; entries: Definition[] }
    | { type: "callout"; data: Callout }

interface Section {
    number: string
    title: string
    blocks: Block[]
}

const PREAMBLE = [
    "These terms govern all bookings made through the Seairo SRS platform and form a binding agreement between Seairo Cargo (Pty) Ltd and the Shipper.",
    "IMPORTANT: By confirming a booking on the Seairo SRS platform, the Shipper acknowledges that they have read, understood, and agreed to these Terms and Conditions in their entirety. Please read all clauses carefully before proceeding.",
] as const

const SECTIONS: Section[] = [
    {
        number: "1",
        title: "Definitions and Interpretation",
        blocks: [
            { type: "p", text: "In these Terms and Conditions, unless the context requires otherwise, the following definitions shall apply:" },
            {
                type: "definitions",
                entries: [
                    { term: "Seairo / We", def: "Seairo Cargo (Pty) Ltd, the operator of the Seairo Shared Reefer Services (SRS) platform and the contracting carrier." },
                    { term: "Shipper / Customer", def: "The party who books space on the SRS platform and is responsible for the cargo being exported." },
                    { term: "Consignee", def: "The named receiving party at the destination port or nominated cold store/warehouse." },
                    { term: "SRS", def: "Seairo Shared Reefer Services — the shared refrigerated container consolidation service offered by Seairo." },
                    { term: "Platform", def: "The Seairo digital booking and tracking platform through which Shippers book space, upload documentation, and track shipments." },
                    { term: "Reefer Container", def: "A refrigerated intermodal shipping container used to transport temperature-sensitive cargo." },
                    { term: "Sailing Date", def: "The confirmed vessel departure date associated with a booking as displayed on the Platform." },
                    { term: "DAP", def: "Delivered at Place (Incoterms® 2020) — the agreed incoterm for all SRS shipments. Seairo bears risk and cost of delivery to the nominated destination cold store or warehouse." },
                    { term: "Cold Store / Warehouse", def: "The nominated refrigerated facility at destination to which Seairo delivers under DAP terms." },
                    { term: "Regulatory Bodies", def: "Any government authority, customs body, phytosanitary inspectorate, food safety authority, port authority, or other official body with jurisdiction over the shipment." },
                    { term: "Force Majeure", def: "Any event beyond the reasonable control of Seairo, including but not limited to acts of God, war, civil unrest, strikes, pandemics, government sanctions, port closures, or natural disasters." },
                    { term: "Surcharges", def: "Additional charges applied to freight rates, including but not limited to bunker/fuel adjustment factors (BAF), war risk surcharges, congestion surcharges, port dues, and currency adjustment factors (CAF)." },
                ],
            },
        ],
    },
    {
        number: "2",
        title: "Scope and Application",
        blocks: [
            { type: "p", text: "These Terms and Conditions apply to all bookings made through the Seairo SRS platform and govern the relationship between Seairo and the Shipper in respect of the consolidation, carriage, and delivery of refrigerated cargo." },
            { type: "p", text: "These Terms and Conditions apply in addition to, and shall be read together with, any credit application, service agreement, or other contractual documentation previously executed between the parties. In the event of a conflict, these SRS Terms and Conditions shall prevail in respect of SRS shipments." },
            { type: "p", text: "Seairo reserves the right to amend these Terms and Conditions from time to time. The version in force at the time of booking confirmation shall apply to that booking." },
        ],
    },
    {
        number: "3",
        title: "Incoterms, Delivery, and Cost Allocation",
        blocks: [
            { type: "p", text: "All SRS shipments are conducted under Incoterms® 2020 DAP (Delivered at Place). Seairo shall bear all risk, freight, and associated costs from the point of collection/origin to the nominated destination cold store or warehouse." },
            { type: "p", text: "Delivery is deemed complete upon tender of the cargo to Seairo's nominated cold store or warehouse at the destination. Seairo's obligations and liability under DAP cease upon delivery to this facility." },
            { type: "p", text: "The following costs are exclusively for the Consignee's account and are not included in the SRS rate:" },
            {
                type: "ol",
                items: [
                    "Import duties and taxes, including VAT, customs duty, and any other fiscal charges levied by the destination country's authorities;",
                    "Collection of cargo from the nominated cold store or warehouse following delivery;",
                    "Any cold store or warehouse storage charges accrued after the agreed free-time period at destination; and",
                    "Any local charges, terminal handling charges, or demurrage incurred at the destination after delivery to the cold store.",
                ],
            },
            { type: "p", text: "The Shipper is responsible for ensuring that the Consignee is aware of, and prepared to meet, all obligations that fall under the Consignee's account as set out above." },
            {
                type: "callout",
                data: {
                    tone: "info",
                    title: "DAP Note",
                    body: "Under DAP terms, Seairo delivers to the nominated cold store. Import duties, taxes, and onward collection from the cold store are solely the Consignee's responsibility. Seairo assumes no liability for delays or additional costs arising from the Consignee's failure to meet these obligations.",
                },
            },
        ],
    },
    {
        number: "4",
        title: "Accuracy of Information and Shipper Declarations",
        blocks: [
            { type: "p", text: "The Shipper warrants and confirms that all information submitted through the Platform at the time of booking and thereafter is accurate, complete, and correct in all material respects, including but not limited to:" },
            {
                type: "ol",
                items: [
                    "The description, nature, and classification of the commodity;",
                    "The number of pallets, cartons, or units being shipped;",
                    "The gross weight and dimensions of the cargo;",
                    "The required temperature settings and any special handling requirements;",
                    "All applicable commodity codes, phytosanitary details, and regulatory classifications; and",
                    "The identity and contact details of the Consignee.",
                ],
            },
            { type: "p", text: "Any inaccuracy, omission, or misrepresentation in the information provided by the Shipper may result in delays, rejection of cargo, additional costs, or cancellation of the booking. All costs, losses, or penalties arising from inaccurate Shipper declarations shall be for the Shipper's account." },
            { type: "p", text: "Seairo reserves the right to verify any information provided and to reject or suspend a booking pending satisfactory verification." },
        ],
    },
    {
        number: "5",
        title: "Inspections, Export Documentation, and Compliance",
        blocks: [
            { type: "p", text: "The Shipper and/or Exporter is solely responsible for initiating and arranging all required inspections, phytosanitary certificates, export permits, food safety certifications, and any other regulatory documentation required for the export of the cargo." },
            { type: "p", text: "All inspections must be initiated and completed timeously so as to meet the confirmed Sailing Date. The Shipper acknowledges that delays in obtaining inspections or documentation may have a cascading effect on all other Shippers participating in the same shared service." },
            { type: "p", text: "The Shipper undertakes to submit all required documentation and inspection results to Seairo through the Platform within the timeframes stipulated by Seairo or the relevant Regulatory Bodies — whichever is the earlier deadline." },
            { type: "p", text: "Should any additional documentation be required or requested by the Consignee, destination customs authorities, any Regulatory Body at origin or destination, or the shipping line, carrier, or port authority, the Shipper undertakes to provide such documentation promptly and within the stipulated timeframes. Seairo accepts no liability for delays or additional costs arising from the Shipper's failure to submit required documentation timeously." },
            { type: "p", text: "Seairo will provide reasonable assistance to the Shipper in identifying documentation requirements but accepts no responsibility for ensuring that documentation is complete or acceptable to Regulatory Bodies." },
        ],
    },
    {
        number: "6",
        title: "Cargo Rejection by Regulatory Bodies",
        blocks: [
            { type: "p", text: "Should the Shipper's cargo be rejected, refused, or held by any Regulatory Body for any reason whatsoever — including but not limited to phytosanitary failure, food safety non-compliance, incorrect documentation, or prohibited goods — the following shall apply:" },
            {
                type: "ol",
                items: [
                    "The affected cargo will automatically be rolled to the next available SRS sailing;",
                    "All costs, penalties, fines, fumigation charges, re-inspection fees, storage charges, and any other expenses arising from or associated with the rejection shall be for the Shipper's account; and",
                    "Seairo shall not be liable for any consequential losses suffered by the Shipper or Consignee as a result of the rejection or the resulting delay.",
                ],
            },
            { type: "p", text: "The Shipper acknowledges that in a shared reefer service, the timely clearance of each Shipper's cargo is essential to the smooth operation of the service. Seairo reserves the right to proceed with the sailing of cargo belonging to other Shippers that have met all requirements, without waiting for the rejected cargo." },
            { type: "p", text: "Seairo will notify the Shipper of a rejection as soon as reasonably practicable and will use commercially reasonable efforts to accommodate the rejected cargo on the next available sailing, subject to capacity and the Shipper meeting all requirements." },
            {
                type: "callout",
                data: {
                    tone: "danger",
                    title: "Important",
                    body: "Cargo rejection costs — including storage, re-inspection, fines, and penalties — are entirely for the Shipper's account. The shared nature of the SRS service means that individual cargo failures cannot delay the sailing for all other participating Shippers.",
                },
            },
        ],
    },
    {
        number: "7",
        title: "Container Threshold and Minimum Load Requirements",
        blocks: [
            { type: "p", text: "SRS sailings are subject to a minimum load threshold. Should the total confirmed cargo volume for a particular sailing not meet the minimum required threshold as determined by Seairo, the sailing will not proceed and all affected bookings will automatically be rolled to the next available SRS sailing." },
            { type: "p", text: "Seairo will notify affected Shippers as soon as reasonably practicable should a sailing be unable to proceed due to insufficient load." },
            { type: "p", text: "No penalty shall be charged to Shippers in the event of a sailing being cancelled solely due to the container threshold not being met. However, Seairo shall not be liable for any consequential losses, including loss of market, spoilage, or downstream contractual penalties suffered by the Shipper as a result of such a roll." },
            { type: "p", text: "Seairo will use commercially reasonable efforts to minimise the frequency of such rollovers and to provide advance notice of potential capacity shortfalls." },
        ],
    },
    {
        number: "8",
        title: "Cargo Specifications, Dimensions, and Receiving Country Requirements",
        blocks: [
            { type: "p", text: "The Shipper warrants that all cargo tendered for shipment under the SRS service complies fully with:" },
            {
                type: "ol",
                items: [
                    "The physical specifications of the shared reefer container, including maximum weight per pallet, maximum pallet height, and stacking requirements as communicated by Seairo;",
                    "The temperature and humidity requirements applicable to the commodity being shipped;",
                    "All import regulations, phytosanitary requirements, labelling requirements, and food safety standards of the receiving country; and",
                    "All applicable South African export regulations and requirements.",
                ],
            },
            { type: "p", text: "The Shipper acknowledges that non-compliance with cargo specifications may affect other Shippers' cargo in the same container and may give rise to claims for which the non-compliant Shipper shall be solely responsible." },
            { type: "p", text: "Seairo reserves the right to refuse or remove from the container any cargo that does not comply with the specifications or that Seairo reasonably believes may compromise the integrity, temperature, or safety of other cargo in the shared container." },
            { type: "p", text: "The Shipper is responsible for ensuring that pallets are correctly stacked, secured, and packaged in accordance with international shipping standards prior to collection." },
        ],
    },
    {
        number: "9",
        title: "Marine Insurance",
        blocks: [
            { type: "p", text: "All cargo transported under the SRS service is covered by marine cargo insurance arranged by Seairo. The cost of this insurance is included in the SRS rate quoted to the Shipper and is non-negotiable." },
            { type: "p", text: "Marine insurance coverage is a mandatory, non-optional component of the SRS service and applies to all Shippers irrespective of whether the Shipper holds their own independent marine insurance policy. This requirement is in place to safeguard the collective interests of all Shippers in the shared container and to ensure uniform coverage for all cargo." },
            { type: "p", text: "The insurance cover arranged by Seairo is subject to standard marine cargo insurance terms, conditions, and exclusions. In the event of a claim:" },
            {
                type: "ol",
                items: [
                    "The Shipper must notify Seairo in writing within the timeframe stipulated in the insurance policy;",
                    "The Shipper must provide all documentation required to support the claim, including commercial invoices, packing lists, and any survey reports; and",
                    "Any claim proceeds shall be subject to the terms of the applicable insurance policy.",
                ],
            },
            { type: "p", text: "Seairo's marine insurance does not cover losses or damage attributable to inherent vice of the cargo, inadequate packaging, Shipper error, or regulatory rejection." },
            { type: "p", text: "Where a Shipper holds their own marine insurance, they may pursue their own policy for losses not covered under Seairo's policy; however, the Seairo SRS marine insurance remains compulsory and its cost non-refundable." },
            {
                type: "callout",
                data: {
                    tone: "warning",
                    title: "Non-Negotiable",
                    body: "Marine insurance is a mandatory component of every SRS booking. It protects all Shippers in the shared container. This cost will always be included in the SRS rate and cannot be waived or substituted.",
                },
            },
        ],
    },
    {
        number: "10",
        title: "Pricing, Rates, and Surcharge Adjustments",
        blocks: [
            { type: "p", text: "All rates and quotes provided on the Platform or communicated by Seairo represent estimated amounts applicable at the time of booking. Given the inherently volatile nature of international shipping markets, these rates are subject to change." },
            { type: "p", text: "The final rate payable by the Shipper may be adjusted due to any of the following factors, without limitation:" },
            {
                type: "ol",
                items: [
                    "Bunker Adjustment Factor (BAF) and fuel surcharge fluctuations;",
                    "War risk surcharges, including surcharges applicable to vessels transiting conflict zones or high-risk areas;",
                    "Port congestion surcharges and terminal handling charge revisions;",
                    "Currency adjustment factors (CAF) and exchange rate movements;",
                    "Force Majeure events affecting shipping routes, carriers, or port operations;",
                    "Carrier or shipping line general rate increases (GRI);",
                    "Changes in port dues, government levies, or regulatory fees;",
                    "Civil unrest, labour action, or port strikes affecting loading or discharge ports; and",
                    "Any other factor outside of Seairo's reasonable control that materially affects the cost of the service.",
                ],
            },
            { type: "p", text: "Seairo undertakes to notify the Shipper of any material rate adjustments as soon as reasonably practicable after Seairo becomes aware of such changes. Seairo will communicate all rate changes transparently and in writing through the Platform or via direct correspondence." },
            { type: "p", text: "Rate adjustments may occur prior to, during, or after loading. Where an adjustment is confirmed after booking but before sailing, the Shipper will be notified and an updated invoice will be issued." },
            { type: "p", text: "The Shipper acknowledges and accepts that rate adjustments are an inherent characteristic of international sea freight and that the volatile global shipping environment may result in pricing changes beyond the initial estimate. Seairo will at all times endeavour to minimise the impact of such adjustments and keep the Shipper fully informed." },
            { type: "p", text: "Payment of any rate adjustment or surcharge is a condition of release of cargo at destination. Seairo reserves the right to place a lien on cargo pending settlement of outstanding amounts." },
            {
                type: "callout",
                data: {
                    tone: "rate",
                    title: "Rate Notice",
                    body: "Given the current volatile global shipping environment — including geopolitical uncertainty, fluctuating fuel prices, and carrier surcharge changes — quoted rates are estimates only. Seairo commits to transparent, timely communication of any rate changes and will always keep Shippers updated as adjustments arise.",
                },
            },
        ],
    },
    {
        number: "11",
        title: "Payment Terms",
        blocks: [
            { type: "p", text: "Payment terms are as per the Shipper's approved credit application with Seairo. All standard payment terms and conditions of the credit application are incorporated herein by reference." },
            { type: "p", text: "Where no credit facility exists, payment of the estimated freight and associated charges is required prior to loading. Seairo reserves the right to withhold space in the container until payment or acceptable security is received." },
            { type: "p", text: "Any surcharges or rate adjustments notified in accordance with clause 10 above are due and payable within the period specified in the adjustment notice or, if not specified, within 7 (seven) days of the date of the adjustment invoice." },
            { type: "p", text: "Seairo reserves the right to charge interest on overdue amounts at the prime lending rate plus 2% (two percent) per annum, calculated daily from the due date to the date of payment." },
        ],
    },
    {
        number: "12",
        title: "Limitation of Liability",
        blocks: [
            { type: "p", text: "Seairo's liability in respect of loss of or damage to cargo shall be limited to the lesser of:" },
            {
                type: "ol",
                items: [
                    "The actual proven loss or damage to the cargo; or",
                    "The applicable limit under the Hague-Visby Rules or such other international convention as may apply to the shipment.",
                ],
            },
            { type: "p", text: "Seairo shall not be liable for:" },
            {
                type: "ol",
                items: [
                    "Consequential, indirect, or special losses of any nature;",
                    "Loss of market, loss of profit, or loss of contract opportunity;",
                    "Delays caused by Force Majeure events, Regulatory Body actions, port congestion, or carrier operational decisions;",
                    "Losses arising from the Shipper's own breach of these Terms and Conditions; or",
                    "Losses arising from the rejection of cargo by any Regulatory Body.",
                ],
            },
            { type: "p", text: "Seairo shall not be liable for temperature excursions or cargo damage where such damage is attributable to the inherent nature of the commodity, inadequate packaging, incorrect temperature declarations by the Shipper, or pre-existing condition of the cargo at the time of collection." },
            { type: "p", text: "The Shipper shall indemnify and hold Seairo harmless from any claims, losses, damages, costs, or expenses suffered by any third party (including other Shippers in the shared container) arising from the Shipper's breach of these Terms and Conditions, inaccurate declarations, or non-compliant cargo." },
        ],
    },
    {
        number: "13",
        title: "Force Majeure",
        blocks: [
            { type: "p", text: "Seairo shall not be in breach of these Terms and Conditions, nor liable for any failure or delay in performance of its obligations, to the extent that such failure or delay is caused by a Force Majeure event." },
            { type: "p", text: "In the event of a Force Majeure event, Seairo shall notify the Shipper as soon as reasonably practicable and shall use commercially reasonable efforts to resume normal operations as quickly as possible." },
            { type: "p", text: "Costs or losses incurred by the Shipper or Consignee as a result of a Force Majeure event are not recoverable from Seairo. Additional costs arising from the Force Majeure event (such as diversion surcharges, emergency port fees, or rerouting costs) may be passed on to the Shipper by way of a surcharge as contemplated in clause 10." },
        ],
    },
    {
        number: "14",
        title: "Use of the Seairo SRS Platform",
        blocks: [
            { type: "p", text: "The Shipper is responsible for maintaining the security and confidentiality of their Platform login credentials and for all activities conducted through their account." },
            { type: "p", text: "The Shipper warrants that all persons accessing the Platform on their behalf are duly authorised to do so and to bind the Shipper to bookings and obligations created through the Platform." },
            { type: "p", text: "Seairo shall not be liable for any unauthorised access to the Shipper's account where such access results from the Shipper's failure to maintain adequate security measures." },
            { type: "p", text: "All documents uploaded to the Platform by the Shipper are deemed to be accurate, authentic, and submitted with the Shipper's full authority." },
        ],
    },
    {
        number: "15",
        title: "General Provisions",
        blocks: [
            { type: "p", text: "These Terms and Conditions are subject to the laws of the Republic of South Africa. Any dispute arising from or in connection with these Terms and Conditions shall be subject to the exclusive jurisdiction of the South African courts, unless the parties agree in writing to refer the dispute to arbitration." },
            { type: "p", text: "These Terms and Conditions, together with the Shipper's credit application and any booking confirmation issued by Seairo, constitute the entire agreement between the parties in respect of the SRS service and supersede all prior representations, agreements, or understandings." },
            { type: "p", text: "If any provision of these Terms and Conditions is found to be invalid, unlawful, or unenforceable, such provision shall be severed and the remaining provisions shall continue in full force and effect." },
            { type: "p", text: "No waiver by Seairo of any breach of these Terms and Conditions shall constitute a waiver of any subsequent breach." },
            { type: "p", text: "Seairo may cede or assign its rights and obligations under these Terms and Conditions to any subsidiary, holding company, or affiliate without the Shipper's prior consent." },
            { type: "p", text: "All standard terms and conditions applicable under Seairo's general trading conditions and credit application are incorporated herein by reference and apply to all SRS shipments." },
        ],
    },
    {
        number: "16",
        title: "Contact and Dispute Resolution",
        blocks: [
            { type: "p", text: "For queries relating to these Terms and Conditions, bookings, rate adjustments, or any other SRS matter, please contact Seairo through the Platform or at the contact details provided in your booking confirmation." },
            { type: "p", text: "Seairo undertakes to respond to all queries within 2 (two) business days and to keep Shippers proactively informed of any developments affecting their bookings." },
        ],
    },
]

const CALLOUT_STYLES: Record<Callout["tone"], { bg: string; border: string; text: string; icon: typeof Info }> = {
    info: { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-900/50", text: "text-blue-900 dark:text-blue-200", icon: Info },
    warning: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-900/50", text: "text-amber-900 dark:text-amber-200", icon: ShieldAlert },
    danger: { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-900/50", text: "text-red-900 dark:text-red-200", icon: AlertTriangle },
    rate: { bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-900/50", text: "text-purple-900 dark:text-purple-200", icon: FileText },
}

function CalloutBlock({ data }: { data: Callout }) {
    const style = CALLOUT_STYLES[data.tone]
    const Icon = style.icon
    return (
        <div className={`flex items-start gap-3 rounded-xl border p-4 my-4 ${style.bg} ${style.border}`}>
            <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${style.text}`} />
            <div className={`text-sm leading-relaxed ${style.text}`}>
                <p className="font-bold uppercase tracking-wider text-xs mb-1">{data.title}</p>
                <p>{data.body}</p>
            </div>
        </div>
    )
}

interface TermsContentProps {
    /**
     * When true, renders the title at the top inside the content. The /terms
     * page passes false because it has its own page header. The modal passes
     * true so it stands alone.
     */
    showTitle?: boolean
}

export function TermsContent({ showTitle = false }: TermsContentProps) {
    return (
        <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed">
            {showTitle && (
                <div className="mb-6 not-prose">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Terms and Conditions of Service</h2>
                    <p className="text-xs text-slate-500 mt-1">{TERMS_EFFECTIVE_LABEL} · Version {TERMS_VERSION}</p>
                </div>
            )}

            {PREAMBLE.map((p, i) => (
                <p key={i} className="text-slate-700 dark:text-slate-300">{p}</p>
            ))}

            {SECTIONS.map((section) => (
                <section key={section.number} className="mt-6">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white not-prose mb-2">
                        {section.number}. {section.title}
                    </h3>
                    {section.blocks.map((block, i) => {
                        if (block.type === "p") {
                            return <p key={i} className="text-slate-700 dark:text-slate-300">{block.text}</p>
                        }
                        if (block.type === "ol") {
                            return (
                                <ol key={i} className="list-decimal pl-6 my-2 space-y-1.5 text-slate-700 dark:text-slate-300 marker:text-slate-400">
                                    {block.items.map((item, j) => <li key={j}>{item}</li>)}
                                </ol>
                            )
                        }
                        if (block.type === "definitions") {
                            return (
                                <dl key={i} className="my-3 space-y-3 not-prose">
                                    {block.entries.map((d, j) => (
                                        <div key={j} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 sm:gap-4">
                                            <dt className="font-bold text-slate-900 dark:text-white text-sm">{d.term}</dt>
                                            <dd className="text-sm text-slate-700 dark:text-slate-300">{d.def}</dd>
                                        </div>
                                    ))}
                                </dl>
                            )
                        }
                        if (block.type === "callout") {
                            return <CalloutBlock key={i} data={block.data} />
                        }
                        return null
                    })}
                </section>
            ))}

            <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 not-prose">
                <p className="text-xs text-slate-500">
                    Seairo Cargo (Pty) Ltd · Shared Reefer Services® (SRS) ·{" "}
                    <a href="https://www.seairo.com" className="text-brand-blue hover:underline">www.seairo.com</a>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                    All bookings are subject to these Terms and Conditions. By confirming a booking on the Platform, the Shipper accepts these Terms in full.
                </p>
                <p className="text-[10px] text-slate-400 mt-3 font-mono">
                    Version {TERMS_VERSION} · End of Terms and Conditions
                </p>
            </div>
        </div>
    )
}
