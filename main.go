package main

import (
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func main() {
	app := pocketbase.New()

	// Bootstrap collections and seed data on app serve
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		log.Println("OnServe: Initializing collections...")
		if err := initializeCollections(app); err != nil {
			log.Printf("OnServe: Error initializing collections: %v", err)
			return err
		}
		log.Println("OnServe: Collections initialized successfully")
		
		// Seed sample game data
		log.Println("OnServe: Seeding Four Color Card...")
		if err := seedFourColorCard(app); err != nil {
			log.Printf("OnServe: Error seeding Four Color Card: %v", err)
			return err
		}
		log.Println("OnServe: Four Color Card seeded successfully")
		
		return e.Next()
	})

	// Register custom routes
	registerRoutes(app)

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
