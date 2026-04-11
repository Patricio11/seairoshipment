const METASHIP_BASE_URL = "https://api.v3.metaship.ai";

// Module-level token cache
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Authenticate with MetaShip and cache the JWT token.
 * Token is refreshed 5 minutes before expiry.
 */
async function getMetaShipToken(): Promise<string> {
    const now = Date.now();
    if (cachedToken && now < tokenExpiresAt) {
        return cachedToken;
    }

    const clientId = process.env.METASHIP_CLIENT_ID;
    const secretKey = process.env.METASHIP_SECRET_KEY;

    if (!clientId || !secretKey) {
        throw new Error("METASHIP_CLIENT_ID and METASHIP_SECRET_KEY must be set");
    }

    const res = await fetch(`${METASHIP_BASE_URL}/public/v2/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, secretKey }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`MetaShip auth failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    cachedToken = data.accessToken;
    // expiry is an absolute timestamp in ms — subtract 5 minutes buffer
    tokenExpiresAt = data.expiry - 5 * 60 * 1000;

    return cachedToken!;
}

/**
 * Authenticated GET request to MetaShip API.
 */
export async function metaShipGet<T = unknown>(
    path: string,
    params?: Record<string, string>
): Promise<T> {
    const token = await getMetaShipToken();
    const url = new URL(`${METASHIP_BASE_URL}${path}`);

    if (params) {
        for (const [key, value] of Object.entries(params)) {
            if (value) url.searchParams.set(key, value);
        }
    }

    const res = await fetch(url.toString(), {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`MetaShip GET ${path} failed (${res.status}): ${text}`);
    }

    return res.json();
}

/**
 * Authenticated POST request to MetaShip API (for creating bookings).
 */
export async function metaShipPost<T = unknown>(
    path: string,
    body: Record<string, unknown>
): Promise<T> {
    const token = await getMetaShipToken();

    const res = await fetch(`${METASHIP_BASE_URL}${path}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`MetaShip POST ${path} failed (${res.status}): ${text}`);
    }

    return res.json();
}

export interface MetaShipBookingPayload {
    portOfLoadValue: string;       // UN/LOCODE e.g. "ZACPT"
    portOfLoadCity: string;        // e.g. "Cape Town"
    portOfDischargeValue: string;  // UN/LOCODE e.g. "NLRTM"
    portOfDischargeCity: string;   // e.g. "Rotterdam"
    finalDestinationValue: string; // UN/LOCODE e.g. "NLRTM"
    finalDestinationCity: string;  // e.g. "Rotterdam"
    originCountry: string;         // ISO 2-letter e.g. "ZA"
    destinationCountry: string;    // ISO 2-letter e.g. "NL"
    etd: string;
    eta: string;
    voyageNumber: string;
    regimeCode?: string;           // Temperature regime e.g. "EC1"
    incoTerm?: string;             // e.g. "EXW", "FOB"
    carrierReferenceNumber?: string;
    contractNumber?: string;
    carrierScac?: string;
    vesselIMO?: string;
    isHazardous?: boolean;
    containers: Array<{
        containerTypeCode: string;
        containerNo?: string;
        billOfLadingNo?: string;
        sealNo?: string;
        products: Array<{
            productId: number;
            nettWeight: number;
            grossWeight: number;
            pallets: number;
            quantity: number;
            volume?: number;
            batchNumber?: string;
            industrial?: boolean;
            organic?: boolean;
            hazardous?: boolean;
        }>;
    }>;
}

/**
 * Create a booking request in MetaShip.
 * Endpoint: POST /public/v2/booking
 */
export async function createMetaShipBooking(payload: MetaShipBookingPayload) {
    return metaShipPost<{
        message: string;
        data: { orderNo: string; systemReference: string };
    }>("/public/v2/booking", buildBookingBody(payload));
}

/**
 * Create an order in MetaShip (preferred over booking).
 * Orders appear in MetaShip's order management view for review before sending.
 * Endpoint: POST /public/v2/order
 */
export async function createMetaShipOrder(payload: MetaShipBookingPayload) {
    return metaShipPost<{
        message: string;
        data: { orderNo: string; systemReference: string };
    }>("/public/v2/order", buildBookingBody(payload));
}

function buildBookingBody(payload: MetaShipBookingPayload) {
    return {
        movementType: "EXPORT",
        serviceType: "FCL",
        modeOfTransport: "OCEAN",
        originCountry: payload.originCountry,
        destinationCountry: payload.destinationCountry,
        portOfLoadValue: payload.portOfLoadValue,
        portOfLoadCity: payload.portOfLoadCity,
        portOfDischargeValue: payload.portOfDischargeValue,
        portOfDischargeCity: payload.portOfDischargeCity,
        finalDestinationValue: payload.finalDestinationValue,
        finalDestinationCity: payload.finalDestinationCity,
        etd: payload.etd,
        eta: payload.eta,
        voyageNumber: payload.voyageNumber,
        ...(payload.regimeCode ? { regimeCode: payload.regimeCode } : {}),
        incoTerm: payload.incoTerm || "EXW",
        carrierReferenceNumber: payload.carrierReferenceNumber || "",
        contractNumber: payload.contractNumber || "",
        carrierScac: payload.carrierScac || "",
        vesselIMO: payload.vesselIMO || "",
        isHazardous: payload.isHazardous || false,
        containers: payload.containers.map(c => ({
            containerNo: c.containerNo || "",
            billOfLadingNo: c.billOfLadingNo || "",
            sealNo: c.sealNo || "",
            containerTypeCode: c.containerTypeCode,
            products: c.products,
        })),
    };
}

/**
 * Upload a document to a MetaShip order.
 * The file is sent as base64. MetaShip stores it in S3 and returns a presigned URL.
 * Endpoint: POST /public/v2/order/document
 */
export interface MetaShipDocumentUpload {
    file: string;            // base64-encoded file content
    name: string;            // filename e.g. "ACC123_invoice.pdf"
    mimeType: string;        // e.g. "application/pdf"
    type: MetaShipDocumentType;
    orderId?: number;        // from order creation response
    bookingId?: number;      // from booking creation response
    bookingContainerId?: number;
}

export type MetaShipDocumentType =
    | "DOCUMENTATION_PACK"
    | "PACKING_LIST"
    | "COMMERCIAL_INVOICE"
    | "INVOICE"
    | "SUPPLIER_INVOICE"
    | "SHIPMENT_DOCUMENT";

export async function uploadMetaShipDocument(payload: MetaShipDocumentUpload) {
    return metaShipPost<{
        message: string;
        result: {
            id: string;
            name: string;
            size: number;
            mimeType: string;
            type: string;
            url: string;
            createdAt: string;
        };
    }>("/public/v2/order/document", payload as unknown as Record<string, unknown>);
}
