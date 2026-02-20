/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db);

    // 1. Update users collection
    const users = dao.findCollectionByNameOrId("users");
    users.schema.addField(new SchemaField({
        name: "role",
        type: "select",
        required: false,
        options: { values: ["admin", "operator"] }
    }));
    users.schema.addField(new SchemaField({
        name: "must_change_password",
        type: "bool",
        required: false,
    }));
    dao.saveCollection(users);

    // 2. Create condominium collection
    const condominium = new Collection({
        name: "condominium",
        type: "base",
        schema: [
            { name: "name", type: "text", required: true },
            { name: "cnpj", type: "text" },
            { name: "address", type: "text" },
            { name: "phone", type: "text" },
            { name: "tower_count", type: "number" },
            { name: "tower_prefix", type: "text" },
            { name: "tower_naming", type: "text" },
            { name: "party_room_name", type: "text" },
            { name: "party_room_capacity", type: "number" },
            { name: "party_room_rules", type: "text" },
            { name: "party_room_count", type: "number" },
            { name: "party_room_naming", type: "text" },
        ],
        listRule: "", viewRule: "", createRule: "role = 'admin'", updateRule: "role = 'admin'", deleteRule: "role = 'admin'",
    });
    dao.saveCollection(condominium);

    // 3. Create units collection
    const units = new Collection({
        name: "units",
        type: "base",
        schema: [
            { name: "unit_number", type: "text", required: true },
            { name: "block", type: "text" },
            { name: "resident_name", type: "text", required: true },
            { name: "phone_number", type: "text" },
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    dao.saveCollection(units);

    // 4. Create vehicles collection
    const vehicles = new Collection({
        name: "vehicles",
        type: "base",
        schema: [
            { name: "plate", type: "text", required: true },
            { name: "model", type: "text", required: true },
            { name: "color", type: "text" },
            { name: "type", type: "select", options: { values: ["car", "motorcycle", "truck"] } },
            { name: "unit_id", type: "relation", required: true, options: { collectionId: units.id, maxSelect: 1 } },
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    dao.saveCollection(vehicles);

    // 5. Create service_providers collection
    const service_providers = new Collection({
        name: "service_providers",
        type: "base",
        schema: [
            { name: "name", type: "text", required: true },
            { name: "document", type: "text" },
            { name: "company", type: "text" },
            { name: "photo", type: "file", options: { maxSelect: 1, maxSize: 5242880 } },
            { name: "entry_time", type: "date" },
            { name: "exit_time", type: "date" },
            { name: "unit_id", type: "relation", options: { collectionId: units.id, maxSelect: 1 } },
            { name: "created_by", type: "relation", options: { collectionId: users.id, maxSelect: 1 } },
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    dao.saveCollection(service_providers);

    // 6. Create parcels collection
    const parcels = new Collection({
        name: "parcels",
        type: "base",
        schema: [
            { name: "protocol_number", type: "text" },
            { name: "description", type: "text", required: true },
            { name: "photo", type: "file", options: { maxSelect: 1, maxSize: 5242880 } },
            { name: "status", type: "select", required: true, options: { values: ["pending", "collected"] } },
            { name: "arrived_at", type: "date", required: true },
            { name: "collected_at", type: "date" },
            { name: "unit_id", type: "relation", required: true, options: { collectionId: units.id, maxSelect: 1 } },
            { name: "created_by", type: "relation", options: { collectionId: users.id, maxSelect: 1 } },
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    dao.saveCollection(parcels);

    // 7. Create rental_guests collection
    const rental_guests = new Collection({
        name: "rental_guests",
        type: "base",
        schema: [
            { name: "name", type: "text", required: true },
            { name: "document", type: "text" },
            { name: "plate", type: "text" },
            { name: "photo", type: "file", options: { maxSelect: 1, maxSize: 5242880 } },
            { name: "entry_time", type: "date", required: true },
            { name: "exit_time", type: "date" },
            { name: "unit_id", type: "relation", required: true, options: { collectionId: units.id, maxSelect: 1 } },
            { name: "created_by", type: "relation", options: { collectionId: users.id, maxSelect: 1 } },
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    dao.saveCollection(rental_guests);

    // 8. Create party_room_bookings collection
    const party_room_bookings = new Collection({
        name: "party_room_bookings",
        type: "base",
        schema: [
            { name: "booking_date", type: "date", required: true },
            { name: "period", type: "select", required: true, options: { values: ["morning", "afternoon", "full_day"] } },
            { name: "party_room_id", type: "text" },
            { name: "unit_id", type: "relation", required: true, options: { collectionId: units.id, maxSelect: 1 } },
            { name: "created_by", type: "relation", options: { collectionId: users.id, maxSelect: 1 } },
        ],
        listRule: "", viewRule: "", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''", deleteRule: "role = 'admin'",
    });
    dao.saveCollection(party_room_bookings);

    // 9. Create initial admin user
    try {
        const user = new Record(users);
        user.setEmail("admin@admin.com");
        user.setPassword("admin123");
        user.set("role", "admin");
        user.set("name", "Administrador");
        user.set("must_change_password", false);
        dao.saveRecord(user);
    } catch (e) {
        // User probably exists
    }
}, (db) => {
    // Optional rollback
})
