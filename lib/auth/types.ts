import { User } from "@/types";

export type Session = {
    user: User;
    session: {
        id: string;
        expiresAt: Date;
        ipAddress?: string;
        userAgent?: string;
    }
}
