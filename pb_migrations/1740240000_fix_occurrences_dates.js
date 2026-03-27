/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    let occurrences;
    try {
        occurrences = app.findCollectionByNameOrId("occurrences");
    } catch (e) {
        console.log("Occurrences collection not found, skipping migration.");
        return;
    }

    // Add autodate fields if they don't exist
    const addField = (field) => {
        try {
            occurrences.fields.add(field);
        } catch (e) {
            console.log("Field already exists or error:", e);
        }
    };

    addField(new AutodateField({
        name: "created",
        onCreate: true,
        onUpdate: false,
    }));

    addField(new AutodateField({
        name: "updated",
        onCreate: true,
        onUpdate: true,
    }));

    return app.save(occurrences);
}, (app) => {
    // Rollback: nothing needed
})
