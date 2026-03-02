/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = new Collection({
        "name": "visitors",
        "type": "base",
        "fields": [
            {
                "name": "name",
                "type": "text",
                "required": true,
                "presentable": true
            },
            {
                "name": "document",
                "type": "text",
                "presentable": true
            },
            {
                "name": "phone",
                "type": "text"
            },
            {
                "name": "photo",
                "type": "file",
                "options": {
                    "maxSelect": 1,
                    "maxSize": 5242880,
                    "mimeTypes": [
                        "image/jpeg",
                        "image/png",
                        "image/svg+xml",
                        "image/gif",
                        "image/webp"
                    ]
                }
            }
        ],
        "listRule": "@request.auth.id != ''",
        "viewRule": "@request.auth.id != ''",
        "createRule": "@request.auth.id != ''",
        "updateRule": "@request.auth.id != ''",
        "deleteRule": "@request.auth.id != ''",
    });

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("visitors");
    return app.delete(collection);
})
