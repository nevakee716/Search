# Description
This layout allows users to search some data in the repository. While the Global Search engine performs a query on the whole repository, this layout allows users to define their own scope and search options.

# Installation  
[https://github.com/casewise/cpm/wiki](https://github.com/casewise/cpm/wiki)   

# How to set up
Create the following structure :

<img src="https://github.com/JGrndn/Search/blob/master/screen/1.JPG" style="width:95%" />  

Configure the layout using the options :  
<img src="https://github.com/JGrndn/Search/blob/master/screen/2.JPG" style="width:95%" /> 

Also, select all the properties you want to look in, for each node.

The options are the following :  
### Complementary Nodes  
Used to add some data into the scope of search.  
Ex : `["nodeId1", "nodeId2"]`
### Exact match  
Indicates whether you want to search for the exact term or not. For exemple, if you look for "data" you can choose if you want a match when an object contains the word "database" or not.  
_This option can be modified at the user level._
### All words
Indicates whether you want to retrieve an object if it contains all the searched terms or not. For exemple, if you look for "Oracle database", the default behavior will make the engine retrieve an object if it contains "Oracle" or "Database". if you check this option, the retrieved items will contains "Oracle" *and* "Database".  
_This option can be modified at the user level._
### Scope
You can defined a init scope for your search engine. The structure of the data should use the JSON syntax:  
`{"activite_1876185931":["name", "description"]}`

## Result  
Below is a screenshot of what you get once your layout is deployed.  
<img src="https://github.com/JGrndn/Search/blob/master/screen/3.JPG" style="width:95%" />  

