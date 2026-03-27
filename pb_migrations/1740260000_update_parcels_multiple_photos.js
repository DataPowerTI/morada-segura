/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("parcels");
  
  const photoField = collection.fields.getByName("photo");
  if (photoField) {
      photoField.maxSelect = 5;
      app.save(collection);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("parcels");
  
  const photoField = collection.fields.getByName("photo");
  if (photoField) {
      photoField.maxSelect = 1;
      app.save(collection);
  }
});
