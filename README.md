# Shelves Organiser

A web application to organize and catalog items stored in boxes, shelves, and rooms. This tool helps you manage a hierarchy of locations, generate QR codes for boxes, and quickly find any item you've stored.

## Table of Contents

- [Shelves Organiser](#shelves-organiser)
  - [Table of Contents](#table-of-contents)
  - [Project Description](#project-description)
  - [Tech Stack](#tech-stack)
  - [Getting Started Locally](#getting-started-locally)
  - [Available Scripts](#available-scripts)
  - [Project Scope](#project-scope)
  - [Project Status](#project-status)
  - [License](#license)

## Project Description

Shelves Organiser is designed for private users who want a simple and efficient way to catalog their belongings. It solves the common problem of losing track of items stored in garages, attics, or storage units. With this application, you can create a digital inventory of your items, assign them to specific boxes and locations, and find them easily with a powerful search tool.

## Tech Stack

The project is built with a modern tech stack:

- **Framework**: [Astro](https://astro.build/)
- **UI Framework**: [React](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Runtime**: [Node.js](https://nodejs.org/)

## Getting Started Locally

To run the project on your local machine, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/storage-shelves-and-box-organizer.git
    cd storage-shelves-and-box-organizer
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  Open your browser and navigate to `http://localhost:3000`.

## Available Scripts

In the project directory, you can run the following commands:

- `npm run dev`
  - Runs the app in development mode.

- `npm run build`
  - Builds the app for production to the `dist` folder.

- `npm run preview`
  - Serves the production build locally for preview.

- `npm run lint`
  - Lints the codebase for potential errors.

- `npm run lint:fix`
  - Lints the codebase and automatically fixes issues.

- `npm run format`
  - Formats the code using Prettier.

## Project Scope

The key features of the application include:

- **User Authentication**: Secure registration and login for users.
- **Hierarchical Locations**: Create and manage a location hierarchy up to four levels deep (e.g., Room -> Rack -> Shelf).
- **Box Management**: Add, edit, and delete boxes within any location.
- **Item Management**: Catalog items with names, tags, and descriptions inside each box.
- **Search**: Quickly find items by name or tags, with filters for locations.
- **QR Code Generation**: Generate unique QR codes for each box that link to its contents list.
- **Label Printing**: Print A4 sheets with labels for your boxes, including names, locations, and QR codes.
- **Public Sharing**: Share the contents of a box via a public, read-only link.
- **Data Export**: Export all your data to a CSV file.

## Project Status

This project is currently **in development**.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.