# Getting Started with SensDat Development

1. Make sure that you have NVM installed.
2. Clone the Repo onto your local machine using your choice of git cloning methods.
3. cd into the src folder.
4. Run a npm install from the terminal to download all the required node modules.
5. Start the app in development mode with `npm start`.
6. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

Note that the app was initially created with [Create React App](https://create-react-app.dev/).

# SensDat Deployment

SensDat is deployed as a static website at (sensdat.cs.vt.edu)[sensdat.cs.vt.edu].
Steps to push new code:
1. Open up your terminal, navigate to the top-level SensDatfolder, and build the code locally via `npm run build`.
1. If you're not on VT's network, use Pulse Secure to proxy.
1. Now we'll use the `sftp` command to transfer the build files to the server!
   1. Run `sftp danielmanesh@128.173.236.236` (or if you have another username) and enter the password.
   1. Run `cd sensdat`.
   1. Run `put -r build`. 
        - NOTE: This will clobber whatever's currently in the directly `build` on the server with the local `build` directory. If you're not sure you want to clobber the old `build` directory, you can `ssh` in to the server and copy it to to the directory `sensdat/old_builds/` as backup.
1. That's it!

# File Organization

**_NOTE:_** This may not be exhaustive or up-to-date. Please update as needed :)


## Where to Start?

1. `index.js` This contains the root component of the app. Good for getting a high-level view of how all the components are assembled.
1. `app-state.js` This file is for managing the "app-state", i.e., a blob of state that is initialized in `index.js` and passed down/shared with all the subcomponents. 
This file also has various functions for mutating the app-state. Most state needed by multiple components should live and be managed here. 

### Data Visualization Development Files

1. `viz-view.js` for development on the main data visualization.
2. `viz-data-editor.js` for development on the edit data section of the visualization.
3. `upload-layout.js` for development on uploading a site layout to display on the visualization. 

### Data Table Development Files

1. `data-view.js` for the component that houses the tabs with the data and summary tables
1. `data-table.js` for main development on the base data table.
1. `summary-tabl.sj` for summary tables based on states.

### States
1. `state-view.js` for the component that lists the currently-existing states.
1. `states/<state-name>.js` has a special object for each state.
1. `utils.js` has a list `stateFactories` which needs to be updated for each state (though that's kind of sad).
1. For individual states:
    1. `create-region-interaction.js` for Region State creation (which is embedded in `viz-view.js`).
    1. `compound-state-pane.js` is a component for creating Combination States
    1. `condition-state-pane.js` is a component for creating Condition States
    1. `sequence-state-pane.js` is a component for creating Sequence States
    1. `timespan-state-panel.js` is a component for creatign Timespan states.
