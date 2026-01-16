import React, { useState, useRef, useEffect } from 'react';
import { Play, FileText, Grid3x3, Settings, Home, Download, Upload, RotateCcw, ZoomIn, ZoomOut, ChevronDown, ChevronUp, Layers, Box, Cpu } from 'lucide-react';

// Parse OpenFOAM points file
const parseOpenFOAMPoints = (content) => {
  try {
    let cleaned = content.replace(/\/\*[\s\S]*?\*\//g, '');
    cleaned = cleaned.replace(/\/\/.*$/gm, '');
    
    const countMatch = cleaned.match(/^\s*(\d+)\s*$/m);
    if (!countMatch) return null;
    
    const pointCount = parseInt(countMatch[1]);
    const afterCount = cleaned.substring(cleaned.indexOf(countMatch[0]) + countMatch[0].length);
    const openParen = afterCount.indexOf('(');
    
    if (openParen === -1) return null;
    
    let depth = 0, start = -1, end = -1;
    
    for (let i = openParen; i < afterCount.length; i++) {
      if (afterCount[i] === '(') {
        if (depth === 0) start = i + 1;
        depth++;
      } else if (afterCount[i] === ')') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    
    if (start === -1 || end === -1) return null;
    
    const pointsData = afterCount.substring(start, end);
    const vectorRegex = /\(\s*([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s*\)/g;
    
    const points = [];
    let match;
    
    while ((match = vectorRegex.exec(pointsData)) !== null) {
      points.push([
        parseFloat(match[1]),
        parseFloat(match[2]),
        parseFloat(match[3])
      ]);
    }
    
    return points;
  } catch (error) {
    console.error('Error parsing points:', error);
    return null;
  }
};