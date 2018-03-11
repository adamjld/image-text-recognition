import React, { Component } from 'react';
import Dropzone from 'react-dropzone';
import ImageLoader from 'react-image-file';
import {sharpenCanvas} from '../../utilities/CanvasFilters';
import {generateGuid} from '../../utilities/Guid';

class ImageThumbnailWithPreview extends Component {
    constructor(){
        super();
        
        this.state = {
            imagePreviewVisible: false
        }
    }
    
    render(){
        return(
            <div onMouseEnter={() => this.setState({imagePreviewVisible: true})} onMouseOut={() => this.setState({imagePreviewVisible: false})}>
                <ImageLoader height={150} width={300} file={this.props.image}/>
            </div>
        )
    }
}

const LoadingOverlay = props => {
    return (
        <div className={"loading-overlay" + (props.loadingOverlayActive ? " active" : "")} />
    );
}

const AcceptedFilesTable = props => {
    let fileRows = props.files.map((file, i) => {
        const processedIcon = file.processed ? "check" : "close";
        const processedIconColor = file.processed ? "green" : "red";
        
        return (
            <tr key={"file-" + (i + 1)}>
                  <td><ImageThumbnailWithPreview image={file.blob} /></td>
                  {file.result &&
                      <td>{file.result.lines.map((line, i) => <p key={"line-" + i}>{line.text}</p>)}</td>
                  }
            </tr>
        )
    });
    
    return(
        <table className="table">
          <thead>
            <tr>
              <th>Image Preview</th>
              <th>Text</th>
            </tr>
          </thead>
          <tbody>
            {fileRows}
          </tbody>
        </table>
    );
}

class Dashboard extends Component {
    constructor(){
        super();
        
        this.state = {
            loadingOverlayActive: false,
            acceptedFiles : []
        }
    }

    onDrop(acceptedFiles) {
        acceptedFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                const fileAsBinaryString = reader.result;
                const id = generateGuid();
                let acceptedFiles = this.state.acceptedFiles;
                
                acceptedFiles.push({
                    id,
                    blob: file.preview,
                    data: reader.result,
                    inProgress: false,
                    name: file.name,
                    processed: false,
                    result: false
                });
                
                this.setState({
                    acceptedFiles
                });
                
                this.processImage(id);
            };
            reader.onabort = () => console.log('file reading was aborted');
            reader.onerror = () => console.log('file reading has failed');
            reader.readAsDataURL(file);
        });
    }
    
    processImage(id){
        const image = this.state.acceptedFiles.find(file => {
            return file.id === id;
        })
        
        this.createCanvasFromImage(image, id);
    }
    
    createCanvasFromImage(image, id){
        const canvas = document.getElementById('placeholderCanvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width * 2.5;
            canvas.height = img.height * 2.5;
            ctx.drawImage(
                img,
                0, img.height - 36, // go to
                img.width, img.height, // selection size
                0, 0, // place at   
                canvas.width, canvas.height // scale to
            );
            
            sharpenCanvas(ctx, canvas.width, canvas.height, 1.2);
            this.readTextFromImage(canvas, id);
        }
        
        img.src = image.blob;
    }
    
    readTextFromImage(input, id){
        this.setState({
            loadingOverlayActive: true
        })
        
        Tesseract.recognize(input, {
            lang: 'eng'
        })
        .progress(p => {
            console.log('progress', p);
        })
        .then(result => {
            let index = this.state.acceptedFiles.findIndex(item => {
                return item.id === id;
            })
            
            //let jsonResult = JSON.stringify(result); 
            
            let updatedItems = this.state.acceptedFiles;
            updatedItems[index].result = result; 
            
            this.setState({
                acceptedFiles: updatedItems,
                loadingOverlayActive: false
            });
        })
    }
    
    render() {
    return (
      <div className="animated fadeIn">
        <Dropzone
            className="dropzone-container"
            accept="image/jpeg, image/png"
            onDrop={this.onDrop.bind(this)}
        >
            <div className="dropzone-inner">
                <i className="dropzone-icon fa fa-upload" style={{display: 'block', fontSize: '5rem'}}></i>
                <span className="dropzone-text">Drag files or click to upload</span>
            </div>
        </Dropzone>
        
        <AcceptedFilesTable files={this.state.acceptedFiles} processImage={this.processImage.bind(this)} />
        <canvas id="placeholderCanvas" style={{display: 'none'}} />
        <LoadingOverlay loadingOverlayActive={this.state.loadingOverlayActive} />
      </div>
    )
    }
}

export default Dashboard;
