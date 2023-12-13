import * as React from "react";
import "../../styles/about/about-page.css";

const People = () => {
  return (
    <div className="People">
      <h1 className="People-title">Contributors</h1>
      <div className="People-description">
       <PeopleGroup 
        title="Director"
        people={["Sang Won Lee"]}
       />
       <PeopleGroup 
        title="Ph.D. students"
        people={["Daniel Manesh"]}
       />
       <PeopleGroup 
        title="Masters students"
        people={[ 
          "Andy Luu",
        "Mohammad Khalid",
        "Jiangyue Li",
        "Chinedu Okonkwo",
        "Abiola Akanmu",
        "Ibukun Awolusi",
        "Homero Murzi"]}
       />
      </div>
    </div>
  );
};

const PeopleGroup = (props) => {
  return (
    <div className="Group">
          <h2>{props.title}</h2>
          <ul>
          {
            props.people.map((p, i) => (
              <li>{p}</li>
            ))
          }
          </ul>
    </div>
  );
};

export default People;
