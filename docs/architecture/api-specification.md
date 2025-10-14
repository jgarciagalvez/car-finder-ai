# API Specification

This API provides the necessary endpoints for the web UI to fetch vehicle data and interact with the AI services. It is designed around a primary conversational endpoint for all AI interactions.

```yaml
openapi: 3.0.0
info:
  title: "Car Finder AI API"
  version: "1.0.0"
  description: "API for the personal Car Finder application."
servers:
  - url: "http://localhost:3000"
    description: "Local development server"

paths:
  /api/vehicles:
    get:
      summary: "Get all vehicles"
      description: "Retrieves a list of all vehicles from the database, including all processed and AI-generated data."
      responses:
        '200':
          description: "A list of all vehicle objects."
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Vehicle"

  /api/vehicles/{id}:
    get:
      summary: "Get a single vehicle by ID"
      description: "Retrieves all details for a single vehicle by its unique internal ID."
      parameters:
        - name: "id"
          in: "path"
          required: true
          schema:
            type: "string"
            description: "The internal CUID or UUID of the vehicle."
      responses:
        '200':
          description: "A single vehicle object."
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Vehicle"
        '404':
          description: "Vehicle not found."
    patch:
      summary: "Update a vehicle's status or notes"
      description: "Updates the user-managed workflow fields for a single vehicle."
      parameters:
        - name: "id"
          in: "path"
          required: true
          schema:
            type: "string"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UpdateVehiclePayload"
      responses:
        '200':
          description: "The updated vehicle object."
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Vehicle"
        '404':
          description: "Vehicle not found."

  /api/vehicles/{id}/translate:
    post:
      summary: "Force translate a vehicle on-demand"
      description: "Triggers translation for a specific vehicle. Useful for re-translating vehicles marked as 'not_interested' or retrying failed translations. Source: Story 2.4c."
      parameters:
        - name: "id"
          in: "path"
          required: true
          schema:
            type: "string"
            description: "The internal CUID or UUID of the vehicle."
        - name: "force"
          in: "query"
          required: false
          schema:
            type: "boolean"
            default: false
            description: "If true, re-translate even if already translated and bypass feature filters."
      responses:
        '202':
          description: "Translation accepted and completed. Returns updated vehicle."
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Vehicle"
        '404':
          description: "Vehicle not found."
        '500':
          description: "Translation failed."
          content:
            application/json:
              schema:
                type: "object"
                properties:
                  error:
                    type: "string"
                    example: "Translation failed"

  /api/vehicles/{id}/analyze:
    post:
      summary: "Force analyze a vehicle on-demand"
      description: "Triggers AI analysis for a specific vehicle. Useful for re-analyzing after user criteria changes or retrying failed analysis. Assumes vehicle is already translated. Source: Story 2.4c."
      parameters:
        - name: "id"
          in: "path"
          required: true
          schema:
            type: "string"
            description: "The internal CUID or UUID of the vehicle."
        - name: "force"
          in: "query"
          required: false
          schema:
            type: "boolean"
            default: false
            description: "If true, re-analyze all steps even if already completed."
      responses:
        '202':
          description: "Analysis accepted and completed. Returns updated vehicle with AI data."
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Vehicle"
        '404':
          description: "Vehicle not found."
        '500':
          description: "Analysis failed."
          content:
            application/json:
              schema:
                type: "object"
                properties:
                  error:
                    type: "string"
                    example: "Analysis failed"

  /api/ai/chat:
    post:
      summary: "Have a contextual conversation with the AI assistant"
      description: "Handles all conversational AI tasks, from analysis to message generation and translation. It requires the context of the UI and the conversation history."
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ChatRequest"
      responses:
        '200':
          description: "The AI assistant's response."
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ChatResponse"

components:
  schemas:
    Vehicle:
      type: "object"
      description: "Represents a single vehicle listing with all processed and generated data."
      properties:
        id:
          type: "string"
        source:
          type: "string"
          enum: ["otomoto", "olx"]
        sourceUrl:
          type: "string"
          format: "uri"
        title:
          type: "string"
        description:
          type: "string"
        features:
          type: "array"
          items:
            type: "string"
        pricePln:
          type: "number"
        priceEur:
          type: "number"
        year:
          type: "integer"
        mileage:
          type: "integer"
        photos:
          type: "array"
          items:
            type: "string"
            format: "uri"
        personalFitScore:
          type: "number"
          nullable: true
        marketValueScore:
          type: "string"
          nullable: true
        aiPriorityRating:
          type: "number"
          nullable: true
        aiPrioritySummary:
          type: "string"
          nullable: true
        aiMechanicReport:
          type: "string"
          nullable: true
        status:
          type: "string"
          enum: ["new", "to_contact", "contacted", "to_visit", "visited", "not_interested", "deleted"]
        personalNotes:
          type: "string"
          nullable: true
        createdAt:
          type: "string"
          format: "date-time"
        updatedAt:
          type: "string"
          format: "date-time"
        # Note: Raw source fields are omitted here for API response clarity
        # but are present in the database model.

    UpdateVehiclePayload:
      type: "object"
      description: "Payload for updating a vehicle's workflow status."
      properties:
        status:
          type: "string"
          enum: ["new", "to_contact", "contacted", "to_visit", "visited", "not_interested", "deleted"]
        personalNotes:
          type: "string"

    ChatMessage:
      type: "object"
      properties:
        role:
          type: "string"
          enum: ["user", "model"]
        content:
          type: "string"

    ChatRequest:
      type: "object"
      properties:
        context:
          type: "object"
          description: "The UI context, e.g., which vehicle is being viewed."
          properties:
            view: 
              type: "string"
              enum: ["dashboard", "detail"]
            vehicleId:
              type: "string"
        conversationHistory:
          type: "array"
          items:
            $ref: "#/components/schemas/ChatMessage"
        userMessage:
          type: "string"

    ChatResponse:
      type: "object"
      properties:
        aiResponse:
          type: "string"
          description: "The AI's response, formatted in Markdown."
```

