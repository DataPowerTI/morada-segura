/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    try {
        const system_logs = app.findCollectionByNameOrId("system_logs");

        // Add a manual timestamp field because the system 'created' field 
        // is mysteriously missing in the VPS environment
        system_logs.fields.add(new DateField({
            name: "timestamp",
            required: false // Better safe than sorry for old records
        }));

        app.save(system_logs);
    } catch (e) {
        console.log("Error adding manual timestamp field:", e);
    }
}, (app) => { })
