"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TermsContent, TERMS_EFFECTIVE_LABEL, TERMS_VERSION } from "./terms-content"

interface TermsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function TermsModal({ open, onOpenChange }: TermsModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Terms and Conditions of Service</DialogTitle>
                    <DialogDescription>
                        {TERMS_EFFECTIVE_LABEL} · Version {TERMS_VERSION}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 -mx-6 px-6 max-h-[65vh]">
                    <TermsContent />
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
