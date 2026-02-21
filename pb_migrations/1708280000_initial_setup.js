/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // Helper function to get or create collection
    const getOrCreate = (name, type = "base") => {
        try {
            return app.findCollectionByNameOrId(name);
        } catch (e) {
            return new Collection({ name, type });
        }
    };

    // 1. Users Collection
    const users = app.findCollectionByNameOrId("users");
    try {
        users.fields.add(new SelectField({ name: "role", values: ["admin", "operator"] }));
        users.fields.add(new BoolField({ name: "must_change_password" }));
        app.save(users);
    } catch (e) { }

    // 2. Condominium
    const condominium = getOrCreate("condominium");
    condominium.fields.add(new TextField({ name: "name", required: true }));
    condominium.fields.add(new TextField({ name: "cnpj" }));
    condominium.fields.add(new TextField({ name: "address" }));
    condominium.fields.add(new TextField({ name: "phone" }));
    condominium.fields.add(new NumberField({ name: "tower_count" }));
    condominium.fields.add(new TextField({ name: "tower_prefix" }));
    condominium.fields.add(new TextField({ name: "tower_naming" }));
    condominium.fields.add(new TextField({ name: "party_room_name" }));
    condominium.fields.add(new NumberField({ name: "party_room_capacity" }));
    condominium.fields.add(new TextField({ name: "party_room_rules" }));
    condominium.fields.add(new NumberField({ name: "party_room_count" }));
    condominium.fields.add(new TextField({ name: "party_room_naming" }));
    condominium.listRule = "@request.auth.id != ''";
    condominium.viewRule = "@request.auth.id != ''";
    condominium.createRule = "@request.auth.id != ''";
    condominium.updateRule = "@request.auth.id != ''";
    app.save(condominium);

    // 3. Units
    const units = getOrCreate("units");
    units.fields.add(new TextField({ name: "unit_number", required: true }));
    units.fields.add(new TextField({ name: "block" }));
    units.fields.add(new TextField({ name: "resident_name", required: true }));
    units.fields.add(new TextField({ name: "phone_number" }));
    units.listRule = "@request.auth.id != ''";
    units.viewRule = "@request.auth.id != ''";
    units.createRule = "@request.auth.id != ''";
    units.updateRule = "@request.auth.id != ''";
    app.save(units);

    // 4. Vehicles
    const vehicles = getOrCreate("vehicles");
    vehicles.fields.add(new TextField({ name: "plate", required: true }));
    vehicles.fields.add(new TextField({ name: "model", required: true }));
    vehicles.fields.add(new TextField({ name: "color" }));
    vehicles.fields.add(new SelectField({ name: "type", values: ["car", "motorcycle", "truck"] }));
    vehicles.fields.add(new RelationField({ name: "unit_id", required: true, collectionId: units.id, maxSelect: 1 }));
    vehicles.listRule = "@request.auth.id != ''";
    vehicles.viewRule = "@request.auth.id != ''";
    vehicles.createRule = "@request.auth.id != ''";
    vehicles.updateRule = "@request.auth.id != ''";
    app.save(vehicles);

    // 5. Service Providers
    const service_providers = getOrCreate("service_providers");
    service_providers.fields.add(new TextField({ name: "name", required: true }));
    service_providers.fields.add(new TextField({ name: "document" }));
    service_providers.fields.add(new TextField({ name: "company" }));
    service_providers.fields.add(new FileField({ name: "photo", maxSelect: 1, maxSize: 5242880 }));
    service_providers.fields.add(new DateField({ name: "entry_time" }));
    service_providers.fields.add(new DateField({ name: "exit_time" }));
    service_providers.fields.add(new RelationField({ name: "unit_id", collectionId: units.id, maxSelect: 1 }));
    service_providers.fields.add(new RelationField({ name: "created_by", collectionId: users.id, maxSelect: 1 }));
    service_providers.listRule = "@request.auth.id != ''";
    service_providers.viewRule = "@request.auth.id != ''";
    service_providers.createRule = "@request.auth.id != ''";
    service_providers.updateRule = "@request.auth.id != ''";
    app.save(service_providers);

    // 6. Parcels
    const parcels = getOrCreate("parcels");
    parcels.fields.add(new TextField({ name: "protocol_number" }));
    parcels.fields.add(new TextField({ name: "description", required: true }));
    parcels.fields.add(new FileField({ name: "photo", maxSelect: 1, maxSize: 5242880 }));
    parcels.fields.add(new SelectField({ name: "status", required: true, values: ["pending", "collected"] }));
    parcels.fields.add(new DateField({ name: "arrived_at", required: true }));
    parcels.fields.add(new DateField({ name: "collected_at" }));
    parcels.fields.add(new RelationField({ name: "unit_id", required: true, collectionId: units.id, maxSelect: 1 }));
    parcels.fields.add(new RelationField({ name: "created_by", collectionId: users.id, maxSelect: 1 }));
    parcels.listRule = "@request.auth.id != ''";
    parcels.viewRule = "@request.auth.id != ''";
    parcels.createRule = "@request.auth.id != ''";
    parcels.updateRule = "@request.auth.id != ''";
    app.save(parcels);

    // 7. Rental Guests
    const rental_guests = getOrCreate("rental_guests");
    rental_guests.fields.add(new TextField({ name: "name", required: true }));
    rental_guests.fields.add(new TextField({ name: "document" }));
    rental_guests.fields.add(new TextField({ name: "plate" }));
    rental_guests.fields.add(new FileField({ name: "photo", maxSelect: 1, maxSize: 5242880 }));
    rental_guests.fields.add(new DateField({ name: "entry_time", required: true }));
    rental_guests.fields.add(new DateField({ name: "exit_time" }));
    rental_guests.fields.add(new RelationField({ name: "unit_id", required: true, collectionId: units.id, maxSelect: 1 }));
    rental_guests.fields.add(new RelationField({ name: "created_by", collectionId: users.id, maxSelect: 1 }));
    rental_guests.listRule = "@request.auth.id != ''";
    rental_guests.viewRule = "@request.auth.id != ''";
    rental_guests.createRule = "@request.auth.id != ''";
    rental_guests.updateRule = "@request.auth.id != ''";
    app.save(rental_guests);

    // 8. Party Room Bookings
    const party_room_bookings = getOrCreate("party_room_bookings");
    party_room_bookings.fields.add(new DateField({ name: "booking_date", required: true }));
    party_room_bookings.fields.add(new SelectField({ name: "period", required: true, values: ["morning", "afternoon", "full_day"] }));
    party_room_bookings.fields.add(new TextField({ name: "party_room_id" }));
    party_room_bookings.fields.add(new RelationField({ name: "unit_id", required: true, collectionId: units.id, maxSelect: 1 }));
    party_room_bookings.fields.add(new RelationField({ name: "created_by", collectionId: users.id, maxSelect: 1 }));
    party_room_bookings.listRule = "@request.auth.id != ''";
    party_room_bookings.viewRule = "@request.auth.id != ''";
    party_room_bookings.createRule = "@request.auth.id != ''";
    party_room_bookings.updateRule = "@request.auth.id != ''";
    app.save(party_room_bookings);

}, (app) => { })
