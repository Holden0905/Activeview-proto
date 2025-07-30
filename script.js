document.addEventListener('DOMContentLoaded', function(){
    let db;
    
    // Initialize SQLite
    async function initDatabase() {
        try {
            const SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });
            
            // Create new database
            db = new SQL.Database();
            
            // Create LDAR components table
            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS components (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client TEXT,
                    description TEXT,
                    building TEXT,
                    unit TEXT,
                    area TEXT,
                    tag TEXT,
                    drawing TEXT,
                    floor INTEGER,
                    component_type TEXT,
                    sub_type TEXT,
                    regulation TEXT,
                    chemical_state TEXT,
                    dtm TEXT,
                    utm TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `;
            
            db.run(createTableSQL);
            
            console.log('🎉 SQLite database initialized successfully!');
            console.log('📊 LDAR components table created');
            
            // Update empty state message
            updateEmptyState('Database ready. Upload Excel file or add components manually.');
            
        } catch (error) {
            console.error('❌ Error initializing database:', error);
        }
    }
    
    // Helper function to update empty state
    function updateEmptyState(message) {
        const emptyRow = document.querySelector('.empty-state td');
        if (emptyRow) {
            emptyRow.textContent = message;
        }
    }

    // Function to load components from database to table
function loadComponentsFromDatabase() {
    const tableBody = document.querySelector('tbody');
    tableBody.innerHTML = '';
    
    const stmt = db.prepare('SELECT * FROM components ORDER BY id');
    
    while (stmt.step()) {
        const row = stmt.getAsObject();
        const newRow = document.createElement('tr');
        
        newRow.innerHTML = `
            <td>${row.drawing || ''}</td>
            <td>${row.building || ''}</td>
            <td>${row.unit || ''}</td>
            <td>${row.area || ''}</td>
            <td>${row.tag || ''}</td>
            <td>${row.component_type || ''}</td>
            <td>${row.sub_type || ''}</td>
            <td>${row.floor || ''}</td>
            <td>${row.regulation || ''}</td>
            <td>${row.chemical_state || ''}</td>
            <td>${row.description || ''}</td>
        `;
        
        tableBody.appendChild(newRow);
    }
    
    stmt.free();
}
    
    // Initialize database when page loads
    initDatabase();
    

    // ... rest of your existing JavaScript
    const searchBox = document.getElementById('searchBox');
    const tableRows = document.querySelectorAll('tbody tr');
    const clearButton = document.getElementById('clearButton');
    // Form handling
    const showFormBtn = document.getElementById('showFormBtn');
    const componentForm = document.getElementById('componentForm');
    const saveComponentBtn = document.getElementById('saveComponent');
    const cancelFormBtn = document.getElementById('cancelForm');

    // File upload handling
    const csvFileInput = document.getElementById('csvFileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadStatus = document.getElementById('uploadStatus');

    // Listen for file selection
    csvFileInput.addEventListener('change', function(){
        const file = csvFileInput.files[0];
        
        if (file) {
            uploadStatus.innerHTML = `Selected: ${file.name} (${Math.round(file.size / 1024)} KB)`;
            uploadStatus.style.color = '#5cb85c';
        } else {
            uploadStatus.innerHTML = '';
        }
    });

    // Listen for upload button click
uploadBtn.addEventListener('click', function(){
    const file = csvFileInput.files[0];
    
    if (!file) {
        uploadStatus.innerHTML = 'Please select a file first!';
        uploadStatus.style.color = '#ff6b6b';
        return;
    }
    
    uploadStatus.innerHTML = 'Reading file...';
    uploadStatus.style.color = '#5cb85c';
    
    // Create FileReader to read the file
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            uploadStatus.innerHTML = 'Processing Excel data...';
            
            // Read the Excel file data
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get the first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            console.log('Excel data loaded:', jsonData);
            console.log('Number of rows:', jsonData.length);
            
            uploadStatus.innerHTML = `Success! Loaded ${jsonData.length} components. Populating table...`;

            // Clear existing table rows
            uploadStatus.innerHTML = 'Saving to database...';

            // Clear existing data
            db.run('DELETE FROM components');

            // Insert each component into database
            const insertSQL = `
                INSERT INTO components (client, description, building, unit, area, tag, drawing, floor, component_type, sub_type, regulation, chemical_state, dtm, utm)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const stmt = db.prepare(insertSQL);

            jsonData.forEach(function(component) {
                stmt.run([
                    component.Client || '',
                    component.Description || '',
                    component.Building || '',
                    component.Unit || '',
                    component.Area || '',
                    component.Tag || '',
                    component.Drawing || '',
                    component.Floor || '',
                    component['Component Type'] || '',
                    component['Sub Type'] || '',
                    component.Regulation || '',
                    component['Chemical State'] || '',
                    component.DTM || '',
                    component.UTM || ''
                ]);
            });

            stmt.free();

            // Now load data from database to table
            loadComponentsFromDatabase();

            uploadStatus.innerHTML = `🎉 SUCCESS! Saved ${jsonData.length} components to database!`;

            console.log('First row keys:', Object.keys(jsonData[0] || {}));
            console.log('First few rows:', jsonData.slice(0, 3));
            console.log('Sample component structure:', jsonData[0]);
           

            uploadStatus.innerHTML = `SUCCESS! Loaded ${jsonData.length} LDAR components into your database!`;
                        uploadStatus.style.color = '#5cb85c';
            
        } catch (error) {
            console.error('Error reading file:', error);
            uploadStatus.innerHTML = 'Error reading file. Please check the format.';
            uploadStatus.style.color = '#ff6b6b';
        }
    };
    
    // Read the file as array buffer
    reader.readAsArrayBuffer(file);
});

    // Show form when "Add New Component" is clicked
    showFormBtn.addEventListener('click', function(){
        componentForm.style.display = 'block';
        showFormBtn.style.display = 'none'; // Hide the button when form is open
    });

    // Hide form when "Cancel" is clicked
    cancelFormBtn.addEventListener('click', function(){
        componentForm.style.display = 'none';
        showFormBtn.style.display = 'block'; // Show the button again
        clearForm(); // Clear all form fields
    });

    // Save new component
saveComponentBtn.addEventListener('click', function(){
    // Get all form values
    const newComponent = {
        drawing: document.getElementById('newDrawing').value.trim(),
        building: document.getElementById('newBuilding').value.trim(),
        unit: document.getElementById('newUnit').value.trim(),
        area: document.getElementById('newArea').value.trim(),
        tag: document.getElementById('newTag').value.trim(),
        componentType: document.getElementById('newComponentType').value.trim(),
        subType: document.getElementById('newSubType').value.trim(),
        floor: document.getElementById('newFloor').value.trim(),
        regulation: document.getElementById('newRegulation').value.trim(),
        chemical: document.getElementById('newChemical').value.trim(),
        description: document.getElementById('newDescription').value.trim()
    };
    
    // Validate - check if all fields are filled
    const isEmpty = Object.values(newComponent).some(value => value === '');
    
    if (isEmpty) {
        alert('Please fill in all fields!');
        return;
    }
    
    // Create new table row
    const tableBody = document.querySelector('tbody');
    const newRow = document.createElement('tr');
    
    newRow.innerHTML = `
        <td>${newComponent.drawing}</td>
        <td>${newComponent.building}</td>
        <td>${newComponent.unit}</td>
        <td>${newComponent.area}</td>
        <td>${newComponent.tag}</td>
        <td>${newComponent.componentType}</td>
        <td>${newComponent.subType}</td>
        <td>${newComponent.floor}</td>
        <td>${newComponent.regulation}</td>
        <td>${newComponent.chemical}</td>
        <td>${newComponent.description}</td>
    `;
    
    // Add the new row to the table
    tableBody.appendChild(newRow);
    
    // Hide form and clear it
    componentForm.style.display = 'none';
    showFormBtn.style.display = 'block';
    clearForm();
    
    // Update the tableRows variable for search functionality
    const tableRows = document.querySelectorAll('tbody tr');
    
    console.log('New component added!', newComponent);
});

    // Function to clear all form fields
    function clearForm() {
        document.getElementById('newDrawing').value = '';
        document.getElementById('newBuilding').value = '';
        document.getElementById('newUnit').value = '';
        document.getElementById('newArea').value = '';
        document.getElementById('newTag').value = '';
        document.getElementById('newComponentType').value = '';
        document.getElementById('newSubType').value = '';
        document.getElementById('newFloor').value = '';
        document.getElementById('newRegulation').value = '';
        document.getElementById('newChemical').value = '';
        document.getElementById('newDescription').value = '';
    }

        // Helper function to get column index
        function getColumnIndex(columnValue) {
            const columnMap = {
                'drawing': 0,
                'building': 1,
                'unit': 2,
                'area': 3,
                'tag': 4,
                'component': 5,
                'subtype': 6,
                'floor': 7,
                'regulation': 8,
                'chemical': 9,
                'description': 10
            };
            return columnMap[columnValue];
        }

    searchBox.addEventListener('input', function(){
        const searchTerm = searchBox.value.toLowerCase();
        const selectedColumn = document.getElementById('searchColumn').value;
        console.log('Searching for:', searchTerm, 'in column:', selectedColumn);
        
        const currentRows = document.querySelectorAll('tbody tr'); // Get fresh rows every time
        currentRows.forEach(function(row){
            const cells = row.querySelectorAll('td');
            let rowMatches = false;
            
            // If searching all columns
            if (selectedColumn === 'all') {
                cells.forEach(function(cell){
                    const originalText = cell.textContent;
                    const lowerText = originalText.toLowerCase();
                    
                    if (searchTerm && lowerText.includes(searchTerm)) {
                        const highlightedText = originalText.replace(
                            new RegExp(searchTerm, 'gi'),
                            `<span style="background-color: #5cb85c; color: #000; padding: 1px 3px; border-radius: 2px;">$&</span>`
                        );
                        cell.innerHTML = highlightedText;
                        rowMatches = true;
                    } else {
                        cell.innerHTML = originalText;
                    }
                });
            } else {
                // Search specific column only
                const columnIndex = getColumnIndex(selectedColumn);
                const targetCell = cells[columnIndex];
                
                if (targetCell) {
                    const originalText = targetCell.textContent;
                    const lowerText = originalText.toLowerCase();
                    
                    // Clear highlighting in all cells first
                    cells.forEach(function(cell){
                        cell.innerHTML = cell.textContent;
                    });
                    
                    if (searchTerm && lowerText.includes(searchTerm)) {
                        const highlightedText = originalText.replace(
                            new RegExp(searchTerm, 'gi'),
                            `<span style="background-color: #5cb85c; color: #000; padding: 1px 3px; border-radius: 2px;">$&</span>`
                        );
                        targetCell.innerHTML = highlightedText;
                        rowMatches = true;
                    }
                }
            }
            
            // Show/hide row
            if (searchTerm === '' || rowMatches) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });

    clearButton.addEventListener('click', function(){
        searchBox.value = '';

        const currentRows = document.querySelectorAll('tbody tr'); // Get fresh rows
        currentRows.forEach(function(row){
            const cells = row.querySelectorAll('td');
            cells.forEach(function(cell){
                cell.innerHTML = cell.textContent;
            });
            row.style.display = '';
        });        
        console.log("cleared!");
    });
});

