# INFOVIS-Project-Group-7

## To run the recommendation system:
Since the recommendation system is build in python, to run it a backend api had to being built. To run the website with the recommendation system the following commands should be followed:
    Install: `pip install fastapi uvicorn pandas numpy python-multipart`  
    Navigate to the folder that the project is saved 
    Run: `python -m uvicorn recommenderSystem.server:app --reload`  
    Open: `http://127.0.0.1:8000/` (API docs: `http://127.0.0.1:8000/docs`)
(otherwise running index.html contains all project without recommendation system) 

## Website interaction
- To use the recommendation system, drag and drop any filter in the box, adjust the filters and run it
- Filters are updated automatically
- Map is interactive (zoom in, zoom out, and reset)
- Each pie of the map is clickable containing the projects
- To see comparison list add two or more projects
- Overview charts are clickable for zoom in
- Results table is also interactive, by clicking project's title, project's info are available
  
