/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const visitors = new Collection({
        name: "visitors",
        type: "base"
    });

    visitors.fields.add(new TextField({ name: "name", required: true }));
    visitors.fields.add(new TextField({ name: "document" }));
    visitors.fields.add(new TextField({ name: "phone" }));
    visitors.fields.add(new FileField({
        name: "photo",
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"]
    }));

    visitors.listRule = "@request.auth.id != ''";
    visitors.viewRule = "@request.auth.id != ''";
    visitors.createRule = "@request.auth.id != ''";
    visitors.updateRule = "@request.auth.id != ''";
    visitors.deleteRule = "@request.auth.id != ''";

    return app.save(visitors);
}, (app) => {
    try {
        const collection = app.findCollectionByNameOrId("visitors");
        return app.delete(collection);
    } catch (e) { }
})
