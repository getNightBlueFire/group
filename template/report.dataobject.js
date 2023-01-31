/****************************************************/
/****************************************************/
/* Common object for report table data manipulation */
/****************************************************/
    /**********************************************/
       /*****************************************/
          /*********************************/
              /*************************/
                  /*****************/
                      /*********/
                        /****/
                         /**/

let dataObject = {
    /* 
    * Object wich contains table
    * Neccessary values:
    * {table: [{line #1}, {line #2}, etc]}
    */
    table: null, 
    /* 
    * Page wich is shown at an HTML-page.
    * The value can be changed during
    * interactive editing of the table 
    */
    currentPage: 1,
    /* 
    * Row wich is selected at an HTML-page.
    * The value can be changed during
    * interactive editing of the table 
    */
    currentRow: null,

    /**
     * Multi-row selection related to single element
     */
    selectedRows: [],
    
    /* Report data: the data is to be changed for each report type */
    MAX_ROWS_FIRST_PAGE: 29, /* Number of rows for the first page */
    MAX_ROWS_ALL_PAGES: 31,  /* Number of rows for all pages excepting first */

    /* Decrease current page position by 1 */
    decrementPage: function(){ 
        if(this.currentPage==1)
            return;
        this.currentRow = null;
        this.currentPage--;
        this.selectElement();
    },
    
    /* Increase current page position by 1 */
    incrementPage: function(){ 
        if(this.currentPage==this.getNumberOfPages())
            return;
        this.currentRow = null;
        this.currentPage++;
        this.selectElement();
    },
    
    getNumberOfPages: function getNumberOfPages(){
        let pageNum = 1;
        for(line of table.table){
            if(line.page_number>pageNum){
                pageNum = line.page_number;
            }
        }
        return pageNum;
    },
    
    /*
    * Returns an array element that matches to selected line.
    * The selected line is defined by currentPage and currentRow values 
    */
    getSelectedLine: function(){
        if(this.currentRow==null)
            return null;
            
        let selectedLine = null;
        for(line of this.table.table){
            if(line.page_number==this.currentPage 
                && line.row_number==this.currentRow){
                    selectedLine = line;
                break;
            }
        }
        return selectedLine;
    },

    /*
     * Returns an array of lines with an element_id
     * recieved as argument.
     * The goal is to get all lines of single/atomic element.
     * Single/atomic element of a table includes lines with the same elemet_id values
     */
    getLineSetById: function(selectedLine){
        if(!selectedLine)
            return [];

        if(!selectedLine.element_id)
            return [selectedLine];

        let lineSet = [];
        for(line of this.table.table){
            if(line.element_id==selectedLine.element_id){
                lineSet.push(line);
            }
        }
        return lineSet;
    },

    /* Inserts a blank line after the selected line */
    insertBlankLineAfter: function(){
        let selectedLine = this.getSelectedLine();
        if(!selectedLine)
            return;

        let defaultId = "";
        if(this.isSingleElementOnBottomInsert()==true)
            defaultId = selectedLine.element_id;

        this.insertBlankLineAtPosition(this.table.table.indexOf(selectedLine)+1, defaultId);
    },

    /* Inserts a blank line before the selected line */
    insertBlankLineBefore: function(){;
        let selectedLine = this.getSelectedLine();
        if(!selectedLine)
            return;

        let defaultId = "";
        if(this.isSingleElementOnTopInsert()==true)
            defaultId = selectedLine.element_id;

        this.insertBlankLineAtPosition(this.table.table.indexOf(selectedLine), defaultId);
        if((this.currentRow<this.MAX_ROWS_FIRST_PAGE && this.currentPage==1)
            ||(this.currentRow<this.MAX_ROWS_ALL_PAGES && this.currentPage!=1)){
                this.currentRow++;
        } else {
            this.currentRow = 1;
            this.currentPage++;
        }
    },

    /* Inserts a blank line at the given position */
    insertBlankLineAtPosition: function(position, defaultId){
        let blankLine = this.generateBlankLine(defaultId);
        this.table.table.splice(position, 0, blankLine);
        this.updateTableCounters();
    },

    shiftSelectedLineUp: function(){
        let selectedLine = this.getSelectedLine();
        if(!selectedLine)
            return;

        let lineSet = this.getLineSetById(selectedLine);
        if(lineSet.length<1)
            return;

        if(!this.checkCanMoveUp(lineSet))
            return;

        let start = this.table.table.indexOf(lineSet[0]);
        let end = lineSet.length==1 ? start : this.table.table.indexOf(lineSet[lineSet.length-1]);
        
        let shiftSize = this.getSizeOfUpperElement(start)
        while(shiftSize-->0){
            for(i=start; i<=end; i++){
                this.swap(this.table.table, i-1, i);
            }
            /* Row value is being changed to an absolute value. 
            'transformSelectedRowGlobalPositionToLocal' has to be called
            to restore appropriate relative row value and matching page value */
            this.currentRow = start;
            start--;
            end--;
        }

        this.updateTableCounters();
        this.transformSelectedRowGlobalPositionToLocal();
    },

    /**
     * Line shifting restraints check
     */
    checkCanMoveUp: function(lineSet){
        let isHeader = lineSet[0].razdel=='true';
        let lineNumber = this.table.table.indexOf(lineSet[0]);
        if(lineNumber==0)
            return false;

        if(this.table.table[lineNumber-1].razdel=='true')
            return false;

        if(isHeader && this.table.table[lineNumber-1].element_id)
            return false;

        return true;
    },

    /**
     * Line shifting restraints check
     */
    checkCanMoveDown: function(lineSet) {
        let lineNumber = this.table.table.indexOf(lineSet[lineSet.length-1]);
        let isHeader =  lineSet[0].razdel=='true';
        if(lineNumber==this.table.table.length-1)
            return false;

        if(this.table.table[lineNumber+1].razdel=='true')
            return false;

        let xx = this.table.table[lineNumber+1].element_id;
        if(isHeader && this.table.table[lineNumber+1].element_id)
            return false;

        return true;
    },

    /**
     * Returns number of lines of a previous element.
     * Single/atomic element of a table includes lines with the same elemet_id values
     */
    getSizeOfUpperElement: function(position){
        let upperElementId = this.table.table[--position].element_id
        if(upperElementId=="" || upperElementId==undefined)
            return 1;

        let lineCounter = 0;
        while((position>=0)&&(this.table.table[position--].element_id==upperElementId))
            lineCounter++;

        return lineCounter;
    },

    shiftSelectedLineDown: function(){
        let selectedLine = this.getSelectedLine();
        if(!selectedLine)
            return;

        let lineSet = this.getLineSetById(selectedLine);
        if(lineSet.length<1)
            return;

        if(!this.checkCanMoveDown(lineSet))
            return;

        let start = this.table.table.indexOf(lineSet[0]);
        let end = lineSet.length==1 ? start : this.table.table.indexOf(lineSet[lineSet.length-1]);

        if(end>=this.table.table.length-1)
            return;

        let shiftSize = this.getSizeOfBottomElement(start)
        while(shiftSize-->0){
            for(i=end; i>=start; i--){
                this.swap(this.table.table, i+1, i);
            }
            
            /* Row value is being changed to an absolute value. 
            'transformSelectedRowGlobalPositionToLocal' has to be called
            to restore appropriate relative row value and matching page value */
            this.currentRow = end + 2; 
            start++;
            end++;
        }
        
        this.updateTableCounters();
        this.transformSelectedRowGlobalPositionToLocal();
    },

    /**
     * Returns number of lines of a next element.
     * Single/atomic element includes lines with the same elemet_id values
     */
    getSizeOfBottomElement: function(position){
        let currentId = this.table.table[position].element_id;
        if(currentId!="")
            while(this.table.table[position].element_id==currentId
                && this.table.table[position].element_id!="")
                ++position;

        let bottomElementId = this.table.table[position].element_id
        if(bottomElementId=="" || bottomElementId==undefined)
            return 1;

        let lineCounter = 0;
        while((position<this.table.table.length)&&(this.table.table[position++].element_id==bottomElementId))
            lineCounter++;

        return lineCounter;
    },

    deleteSelectedLine: function(){
        let selectedLine = this.getSelectedLine();
        if(!selectedLine)
            return;

        this.table.table.splice(this.table.table.indexOf(selectedLine),1);
        this.updateTableCounters();
    },

    /**
     * Recalculates page and row numbers after table-array updating.
     * The rottine has to be stareted after each array sequence changes
     */
    updateTableCounters: function() {
        let rowCounter = 1;
        let pageCounter = 1;
        for(line of this.table.table){
            line.row_number = rowCounter;
            line.page_number = pageCounter;
            if((rowCounter==this.MAX_ROWS_FIRST_PAGE && pageCounter==1)
                ||(rowCounter==this.MAX_ROWS_ALL_PAGES && pageCounter!=1)){
                    rowCounter = 1;
                    pageCounter++;
                } else {
                    rowCounter++;
                }
        }
    },
    
    /**
     *  Transforms absolute current row (value after shifting up/down)
     *  into current row related to appropriate page.
     *  Changes values of currentRow, currentPage
     */
    transformSelectedRowGlobalPositionToLocal: function(){
        let deltaRows = this.currentRow - this.MAX_ROWS_FIRST_PAGE - 1;
        let page = 2 + Math.floor(deltaRows/this.MAX_ROWS_ALL_PAGES);
        let row = deltaRows>=0 ? 
                deltaRows%this.MAX_ROWS_ALL_PAGES + 1
                : this.MAX_ROWS_FIRST_PAGE + deltaRows%this.MAX_ROWS_ALL_PAGES + 1;
        this.currentRow = row;
        this.currentPage = page;
        this.selectElement();
    },

    /**
     * Highlight full element selection
     */
    selectElement(){
        this.selectedRows = [];
        if(!this.currentRow)
            return;

        let deltaRows = this.currentRow - this.MAX_ROWS_FIRST_PAGE - 1;
        let row = deltaRows>=0 ? 
                deltaRows%this.MAX_ROWS_ALL_PAGES + 1
                : this.MAX_ROWS_FIRST_PAGE + deltaRows%this.MAX_ROWS_ALL_PAGES + 1;

        let id = null;
        for(let line of this.table.table){
            if(line.page_number==this.currentPage
                && line.row_number==row){
                id = line.element_id;
            }
        }

        if(!id)
            return;

        let sLine = this.getSelectedLine();
        let lineSet = this.getLineSetById(sLine);
        for(let i of lineSet){
            if(i.page_number==sLine.page_number)
                this.selectedRows.push(i.row_number);
        }
    },

    swap: function(array, x, y){
        let tmp = array[x];
        array[x] = array[y];
        array[y] = tmp;
    },

    /*
    * Checks whether a bottom line inserting 
    * works inside a single/atomic element 
    */
    isSingleElementOnBottomInsert: function(){
        let selectedLine = this.getSelectedLine();
        if(selectedLine.element_id=="" && selectedLine.element_id==undefined)
            return false;

        let position = this.table.table.indexOf(selectedLine);
        if(position>=this.table.table.length-1)
            return false;

        let nextLine = this.table.table[position+1];
        return nextLine.element_id==selectedLine.element_id;
    },

    /*
    * Checks whether an upper line inserting 
    * works inside a single/atomic element 
    */
    isSingleElementOnTopInsert: function(){
        let selectedLine = this.getSelectedLine();
        if(selectedLine.element_id=="" && selectedLine.element_id==undefined)
            return false;
        
        let position = this.table.table.indexOf(selectedLine);
        if(position==0)
            return false;

        let prevLine = this.table.table[position-1];
        return prevLine.element_id==selectedLine.element_id;
    },

    generateBlankLine: function (defaultId) {
        if (!defaultId) defaultId = "";
        return {
          format: "",
          zone: "",
          position: "",
          shifr: "",
          name: "",
          quantity: "",
          note: "",
          row_number: "",
          page_number: "",
          element_id: defaultId,
          is_double_line: ""
        };
      }
};