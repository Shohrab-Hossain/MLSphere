# 🧠 MLSphere

A visual machine learning pipeline creator that allows you to drag and drop ML blocks to build complete training workflows. Each block contains editable Python code and the system provides real-time training analytics and visualizations.

![MLSphere](https://img.shields.io/badge/Vue.js-3.x-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

### 🎯 Drag & Drop Interface
- Intuitive drag-and-drop block system
- Pre-built ML blocks for common tasks
- Visual pipeline construction

### 📝 Editable Code Blocks
- Each block contains Python code
- Built-in code editor
- Customize any block to fit your needs

### 📊 Real-Time Training Analytics
- Live training metrics (accuracy, loss)
- Interactive charts and graphs
- Confusion matrix visualization
- Console output logs

### 🧩 Available Blocks

#### Data Blocks
- **Load Data** 📁 - Import datasets from various sources
- **Data Preprocessing** 🔧 - Clean, transform, and prepare data

#### Model Blocks
- **Neural Network** 🧠 - Create deep learning models
- **Random Forest** 🌳 - Classical ML ensemble method

#### Training Blocks
- **Train Model** 🎯 - Train your model with customizable parameters
- **Evaluate Model** 📊 - Calculate performance metrics
- **Visualize Results** 📈 - Generate plots and visualizations

## 🚀 Getting Started

### Prerequisites
```bash
Node.js >= 12.x
npm >= 6.x
```

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run serve
```

The application will be available at `http://localhost:8080`

### Build for Production

```bash
# Build optimized production bundle
npm run build
```

### Linting

```bash
# Lint and fix files
npm run lint
```

## 📖 How to Use

### 1. Add Blocks to Canvas
- Drag blocks from the left sidebar to the canvas
- Or click on a block to add it automatically

### 2. Arrange Your Pipeline
Build your ML workflow in logical order:
```
Data Loading → Preprocessing → Model Creation → Training → Evaluation → Visualization
```

### 3. Edit Block Code
- Click "Edit Code" on any block
- Modify the Python code as needed
- Save your changes

### 4. Validate Pipeline
- Click "✓ Validate" to check pipeline structure
- Ensures all necessary components are present

### 5. Run Pipeline
- Click "▶ Run Pipeline" to execute
- Watch real-time training progress
- View live metrics and charts

### 6. Export Pipeline
- Click "💾 Export Pipeline" in the sidebar
- Save your pipeline as JSON
- Share or reuse later

## 🏗️ Project Structure

```
mlsphere/
├── src/
│   ├── components/
│   │   ├── BlockLibrary.vue      # Block selection sidebar
│   │   ├── PipelineCanvas.vue    # Main canvas for blocks
│   │   ├── MLBlock.vue            # Individual block component
│   │   ├── CodeEditor.vue         # Code editing modal
│   │   └── TrainingPanel.vue      # Real-time analytics panel
│   ├── data/
│   │   └── blockTypes.js          # ML block definitions
│   ├── App.vue                    # Main application component
│   └── main.js                    # Application entry point
├── public/
│   └── index.html
└── package.json
```

## 🛠️ Technologies

- **Vue.js 3** - Frontend framework
- **Chart.js** - Data visualization
- **Axios** - HTTP client for API calls
- **CodeMirror** - Code editor
- **Vue Draggable Plus** - Drag and drop functionality

## 🎨 Customization

### Adding New Blocks

Edit `src/data/blockTypes.js` and add your block definition:

```javascript
CUSTOM_BLOCK: {
  id: 'custom_block',
  name: 'My Custom Block',
  category: 'Data',
  color: '#FF5722',
  icon: '🎯',
  inputs: ['input1'],
  outputs: ['output1'],
  defaultCode: `# Your Python code here
def custom_function():
    # Implementation
    pass`
}
```

### Styling

Modify component styles in respective `.vue` files or update global styles in `App.vue`.

## 🔮 Future Enhancements

- [ ] Backend integration with Python execution
- [ ] Block connection visualization
- [ ] Import/load saved pipelines
- [ ] More ML algorithm blocks
- [ ] GPU training support
- [ ] Collaborative editing
- [ ] Docker deployment

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For questions or issues, please open an issue on the project repository.

---

**Built with ❤️ for the ML community**
