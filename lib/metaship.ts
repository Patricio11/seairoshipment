const METASHIP_BASE_URL = "https://api.metaship.ai";

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

/**
 * Create a booking in MetaShip with the consolidated container data.
 * Endpoint: POST /public/v2/booking (singular)
 */
export async function createMetaShipBooking(payload: {
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
    containers: Array<{
        containerTypeCode: string;
        products: Array<{
            productId: number;
            nettWeight: number;
            grossWeight: number;
            pallets: number;
            quantity: number;
        }>;
    }>;
}) {
    return metaShipPost<{
        message: string;
        data: { orderNo: string; systemReference: string };
    }>("/public/v2/booking", {
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
        containers: payload.containers,
    });
}
