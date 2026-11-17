# Paper Phone, web edition

A printable Paper Phone which helps you take a break away from your digital world. This fork turns the original Android experiment by [Special Projects](http://specialprojects.studio/project/paper-phone) into a plain HTML web app that runs in any browser, on a computer or a phone, with no install, account or API key.

![Paper Phone Image](190807PaperPhoneStills295-Edit.jpg)

## Use it

Open `index.html` in a browser, or publish the repository with GitHub Pages (Settings, Pages, deploy from the `master` branch, root folder) and visit the address GitHub gives you.

Choose what goes on the sheet, press **Print or save as PDF**, and print in landscape at 100% scale. Then fold three times; the app shows how.

## What it does

Everything the Android app printed:

* Contacts, calendar, tasks, a photo, a notes grid, weather, a paper app, a map with directions on the back, and cut marks for a contactless card.
* The same panel layout, typefaces and thirteen paper apps as the original.

New in the web edition:

* Works without Google sign-in. Type things in, or import contacts from a `.vcf` file and events from an `.ics` calendar export (daily, weekly, monthly and yearly repeats are understood; exceptions to a repeat are not).
* Print for any day, not only today.
* A fresh sudoku or maze every time you ask, and a page of your own text (a shopping list, a phrasebook, a poem).
* Typed text on the notes panel, above the dot grid.
* Weather for any town, in °C or °F, from [Open-Meteo](https://open-meteo.com/).
* Directions on foot, by bike or by car, drawn on an [OpenStreetMap](https://www.openstreetmap.org/copyright) map, using [Nominatim](https://nominatim.org/) for place search and the [FOSSGIS OSRM](https://routing.openstreetmap.de/) routing servers.
* A4 or US Letter paper.
* A backup file you can save and restore, and a live preview of the sheet as you edit.

## Privacy

What you type is stored only in your browser (local storage). Nothing is sent anywhere except the place names you look up for weather and directions, which go to the services listed above. An imported address book is read in the page and is not stored.

The map tiles and lookups come from free community services; they are meant for light personal use.

## Files

* `index.html`, `css/`, `js/` – the web app. `js/sheet.js` draws the sheet as SVG, `js/tools.js` holds the puzzles, importers and lookups, `js/app.js` runs the page.
* `fonts/`, `paperapps/` – typefaces and paper app artwork from the original app.
* `android/` – the original Android source, unchanged.

## About the original

A lot of people feel that they spend too much time on their phones and struggle to find a balance with technology.

Paper Phone helps you have a little break away from your digital world by printing a personal booklet of the key information you’ll need that day. 

An app lets you choose what to include such as favourite contacts, maps and meetings and then prints them directly to a sheet of paper. 

Customisable “paper apps” like recipes, phrasebooks and notepads let you get things done or unwind in a more focussed way. 

We hope this little experiment can help you try a digital detox from technology and help you focus on the things that matter the most.

Paper Phone is an experimental open source Android app which is available to try right now. All of the code is available on Github for people to play with and hopefully adapt and evolve! 

Services:
* [OpenWeather](https://openweathermap.org/api)
* [Directions](https://developers.google.com/maps/documentation/directions/start)
* [Static Maps](https://developers.google.com/maps/documentation/maps-static/intro)
* [Places](https://developers.google.com/places/web-service/intro)
* [Tasks](https://developers.google.com/tasks/)

Android APIs:
* [PdfRenderer](https://developer.android.com/reference/android/graphics/pdf/PdfRenderer) - Rendering PDFs
* [ContentProvider](https://developer.android.com/guide/topics/providers/content-providers) - Read local contacts and calendar events
* [Android Printing Framework](https://developer.android.com/training/printing) - Printing

External libraries:
* [OkHttp](https://square.github.io/okhttp/)
* [Room](https://developer.android.com/topic/libraries/architecture/room)
* [Lottie](http://airbnb.io/lottie/)

[Try the app on the Google Play Store](https://play.google.com/store/apps/details?id=com.withgoogle.experiments.unplugged)

[Read more on Experiments with Google](https://experiments.withgoogle.com/paper-phone)

[Find out even more on our site](http://specialprojects.studio/project/paper-phone)
