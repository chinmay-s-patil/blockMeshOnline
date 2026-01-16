import React, { useState, useRef, useEffect } from 'react';
import { Play, FileText, Grid3x3, Settings, Home, Download, Upload, RotateCcw, ZoomIn, ZoomOut, ChevronDown, ChevronUp, Layers, Box, Cpu } from 'lucide-react';

import ViewerPage from './components/ViewerPage';
import EditorPage from './components/EditorPage';
import { DEFAULT_TEMPLATE } from '../utils/defaultTemplate';
import parseOpenFOAMPoints from './ParseOpenFoam';
import MeshViewer3D from './MeshViewer3D';

export default BlockMeshOnline;