/**
 * Master list of export document types. Used in:
 *  - Admin category management (pick which docs a category requires)
 *  - Client step-3 docs upload (checklist rendering)
 *  - Admin booking review (display the doc code alongside the file)
 *
 * Keep this in sync with any new regulatory requirements.
 */

export interface DocumentType {
    code: string;
    label: string;
    description?: string;
}

export const DOCUMENT_TYPES: DocumentType[] = [
    { code: "COMMERCIAL_INVOICE", label: "Commercial Invoice", description: "Required by customs — declares value + parties" },
    { code: "PACKING_LIST", label: "Packing List", description: "Itemised contents of each pallet" },
    { code: "IMPORT_PERMIT", label: "Copy of Import Permit", description: "Issued by destination country authority" },
    { code: "BILL_OF_LADING", label: "Bill of Lading", description: "Carrier-issued transport document" },
    { code: "EXPORT_CERTIFICATE", label: "Export Certificate", description: "General export approval from origin country" },
    { code: "PPECB_HEALTH_CERTIFICATE", label: "PPECB Health Certificate", description: "Perishable Products Export Control Board health cert" },
    { code: "PPECB_EXPORT_CERTIFICATE", label: "PPECB Export Certificate", description: "PPECB export clearance" },
    { code: "NRCS_HEALTH_CERTIFICATE", label: "NRCS Health Certificate", description: "National Regulator for Compulsory Specifications (fish)" },
    { code: "PHYTO_SANITARY", label: "Phyto-Sanitary Certificate", description: "Plant health (fruit, veg)" },
    { code: "HALAAL_CERTIFICATE", label: "Halaal Certificate", description: "Required for some Middle East destinations" },
    { code: "SAD500", label: "SAD500 Customs Entry", description: "SA Revenue Service customs declaration" },
    { code: "CERTIFICATE_OF_ORIGIN", label: "Certificate of Origin", description: "Declares country of manufacture" },
    { code: "COA", label: "Certificate of Analysis (CoA)", description: "Lab analysis of the consignment" },
    { code: "SGS", label: "SGS Certificate", description: "Third-party inspection (some destinations)" },
    { code: "SAWIS", label: "SAWIS Certificate", description: "South African Wine Industry Information (wine)" },
    { code: "CITES", label: "CITES Certificate", description: "Convention on International Trade in Endangered Species (hunting trophies)" },
    { code: "OTHER", label: "Other", description: "Any other supporting document" },
];

export const DOCUMENT_TYPE_BY_CODE = new Map(DOCUMENT_TYPES.map(d => [d.code, d]));

export function documentLabel(code: string | null | undefined): string {
    if (!code) return "Other";
    return DOCUMENT_TYPE_BY_CODE.get(code)?.label || code;
}
