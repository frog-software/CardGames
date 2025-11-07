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
		if err := initializeCollections(app); err != nil {
			return err
		}
		// Seed sample game data
		if err := seedFourColorCard(app); err != nil {
			return err
		}
		return e.Next()
	})

	// Register custom routes
	registerRoutes(app)

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
