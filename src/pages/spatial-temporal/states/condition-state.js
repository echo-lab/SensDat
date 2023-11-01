import { uid } from "../utils";

// This create a Condition state object with simple functions
// The processing of data mostly done in condition-state-pane.js
export class ConditionState {
    static typeName = "ConditionState";
    constructor(name, data, rows){
        this.id = uid();
        this.rows = rows;
        this.name = name;
        this.data = data;
    }

    getValues(){
        return this.rows.map((row)=>
            String(
                this.data.includes(row)
            )
        );
    }

    asObject(){
        return{
            type:ConditionState.typeName,
            rows:this.rows,
            name:this.name,
            id:this.id,
            data:this.data,
        }
    }

    static fromObject(o) {
        if (o.type !== ConditionState.typeName) return false;
    
        let res = new ConditionState(o.name, o.data, o.rows);
        res.id = o.id;
        return res;
    }
}