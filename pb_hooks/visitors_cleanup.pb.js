// Run daily in the server's timezone.
cronAdd("deleteOldPhotos", "0 0 * * *", () => {
    // Preserve the existing reference dates for people and access records.
    // Parcel retention starts at arrival, regardless of collection status.
    const targets = [
        { collection: "people", dateField: "updated", retentionDays: 7 },
        { collection: "visitors", dateField: "created", retentionDays: 7 },
        { collection: "service_providers", dateField: "created", retentionDays: 7 },
        { collection: "rental_guests", dateField: "created", retentionDays: 7 },
        { collection: "parcels", dateField: "arrived_at", retentionDays: 30 },
    ];

    for (const target of targets) {
        const cutoffDate = new Date(Date.now() - target.retentionDays * 24 * 60 * 60 * 1000)
            .toISOString().replace("T", " ");
        let lastId = "";
        let cleared = 0;

        try {
            // Page by id so saving records cannot skip subsequent records.
            // Failed saves are retried on the next scheduled run.
            while (true) {
                const records = $app.findRecordsByFilter(
                    target.collection,
                    `${target.dateField} < {:cutoffDate} && ${target.dateField} != "" && id > {:lastId}`,
                    "id",
                    100,
                    0,
                    { cutoffDate, lastId },
                );

                if (records.length === 0) break;

                for (const record of records) {
                    lastId = record.id;
                    if (record.getStringSlice("photo").length === 0) continue;

                    try {
                        // Saving through PocketBase also deletes the physical files,
                        // including all photos on parcels with multiple attachments.
                        record.set("photo", null);
                        $app.save(record);
                        cleared++;
                    } catch (error) {
                        console.error(`[deleteOldPhotos] Failed to clear ${target.collection}/${record.id}: ${error}`);
                    }
                }
            }

            console.log(`[deleteOldPhotos] Cleared photos from ${cleared} ${target.collection} records older than ${target.retentionDays} days`);
        } catch (error) {
            // A missing legacy collection must not block the remaining collections.
            console.error(`[deleteOldPhotos] Failed to process ${target.collection}: ${error}`);
        }
    }
});
