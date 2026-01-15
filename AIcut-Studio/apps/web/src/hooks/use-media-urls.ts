import { useState, useEffect } from "react";
import { MediaFile } from "@/types/media";

export function useMediaUrls(mediaFiles: MediaFile[]) {
    const [urls, setUrls] = useState<Record<string, string>>({});

    useEffect(() => {
        const newUrls: Record<string, string> = { ...urls };
        const createdUrls: string[] = [];
        let changed = false;

        // Create URLs for new files
        mediaFiles.forEach((file) => {
            if (!newUrls[file.id]) {
                if (file.url) {
                    // Use existing URL (linked asset)
                    newUrls[file.id] = file.url;
                    changed = true;
                } else if (file.file) {
                    // Create blob URL for uploaded files
                    const url = URL.createObjectURL(file.file);
                    newUrls[file.id] = url;
                    createdUrls.push(url);
                    changed = true;
                }
            }
        });

        // Clean up URLs for removed files
        Object.keys(newUrls).forEach((id) => {
            if (!mediaFiles.find((f) => f.id === id)) {
                URL.revokeObjectURL(newUrls[id]);
                delete newUrls[id];
                changed = true;
            }
        });

        if (changed) {
            setUrls(newUrls);
        }

        // Cleanup function when hook unmounts or mediaFiles changes drastically? 
        // Actually we want to keep URLs stable.
        // The cleanup below should ideally run on unmount.
        /* 
        return () => {
           createdUrls.forEach(url => URL.revokeObjectURL(url));
        } 
        */
        // But since we persist urls in state, we should only revoke orphan ones.
    }, [mediaFiles]);

    // Global cleanup on unmount
    useEffect(() => {
        return () => {
            Object.values(urls).forEach(url => URL.revokeObjectURL(url));
        }
    }, []);

    return urls;
}
