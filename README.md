# INFOVIS-Project-Group-7

### Project Members:
- Alexandros Xanthopoulos
- Konstantinos Zavantias
- Mohammed Bashabeeb
- Mahshid Jafar Tajrishi

## Overview
This project is about the creation of a web-based Interface aiming to create visualizations from the Nature-Based Solutions (NBS) database. The aim is these visualizations to help a persona (Architect/Designer in our case) to explore the database and by using interactive visualizations, such as filters, search bar, and a map to explore the naturvation projects, finds ideas and projects of his/her/its/they interest. Furthermore, the user can also find more information about the projects, compare as many as wants and see useful charts to visualize the content of the database.

### Structure
- Code: contains all needed code for the project to run
      An HTML file that contains the main structure of our webapp
      A CSS file for the styling
      Various JS files for the map, filters, charts
- Data: contains the cleaned dataset after the data wrangling, and the coordinates dataset that has the coordinates of the cities for the map visualization
- Documentation: contains
      The initial and final sketches
      The evaluation report that has an overview of the project and feedback based on given tasks that our persona could do in the featured webapp (primitive phase-drawings)
      Data understanding which are Power BI files that have initial database visualizations
      

## To run the recommendation system:
Since the recommendation system is build in python, to run it a backend api had to being built. To run the website with the recommendation system the following commands should be followed:
    
Install: 
    `pip install fastapi uvicorn pandas numpy python-multipart`  
    
Navigate to the folder that the project is saved 
    
Run: 
    `python -m uvicorn recommenderSystem.server:app --reload`  

Open: 
    `http://127.0.0.1:8000/` (API docs: `http://127.0.0.1:8000/docs`)
(otherwise running index.html contains all project without recommendation system) 

## Website interaction
The following steps/bullets explain possible interaction a user can have with the webapp 

- To use the recommendation system, drag and drop any filter in the box, adjust the filters and run it
- Filters are updated automatically
- Map is interactive (zoom in, zoom out, and reset)
- Each pie of the map is clickable containing the projects, more info and add to comparison buttons and also the legend of the pie
- To see comparison list add two or more projects
- Overview charts are clickable for zoom in
- Results table is also interactive, by clicking project's title, project's info are available
  
