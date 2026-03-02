/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    try {
        const collection = app.findCollectionByNameOrId("party_room_bookings");

        console.log("Updating party_room_bookings rules...");

        // Enabling deletion for authenticated users
        // If you want only admins (from users collection) to delete, you could use:
        // collection.deleteRule = "@request.auth.role = 'admin'";
        // but since we want to be safe for now and follow the pattern of other collections:
        collection.deleteRule = "@request.auth.id != ''";

        app.save(collection);
        console.log("Successfully updated party_room_bookings rules.");
    } catch (e) {
        console.error("Error updating party_room_bookings rules:", e.message);
    }
}, (app) => {
    // Revert logic if needed
    try {
        const collection = app.findCollectionByNameOrId("party_room_bookings");
        collection.deleteRule = null;
        app.save(collection);
    } catch (e) { }
});
