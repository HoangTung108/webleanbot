/** Online and local views share the same millimetre geometry and mat renderer. */
import type {RobotSimulator} from './robotSimulator';
import {SimulatorRenderer} from './renderer';

export interface Color {r:number;g:number;b:number}
export class MultiRobotRenderer {
  private renderer:SimulatorRenderer;
  private peers=new Map<string,RobotSimulator>();
  constructor(canvas:HTMLCanvasElement,localRobot:RobotSimulator){
    const rect=canvas.getBoundingClientRect();
    const width=rect.width||canvas.width||800,height=rect.height||canvas.height||600;
    this.renderer=new SimulatorRenderer(canvas,localRobot,localRobot.getBoard());
    this.renderer.resizeCanvas(width,height);
  }
  addRemoteRobot(peerId:string,robot:RobotSimulator):void {this.peers.set(peerId,robot);}
  removeRemoteRobot(peerId:string):void {this.peers.delete(peerId);this.updatePeers();}
  private updatePeers():void {
    this.renderer.setRemoteRobots([...this.peers].map(([robotId,robot])=>({robotId,pose:robot.getRobotPose(),gripper:robot.getGripper(),supported:robot.getFallState().status==='supported'})));
  }
  render(_boardWidth?:number,_boardHeight?:number):void {this.updatePeers();this.renderer.render();}
  setScale(scale:number):void {if(Number.isFinite(scale)&&scale>0)this.renderer.zoom(scale/this.renderer.getScale());}
  pan(dx:number,dy:number):void {this.renderer.pan(dx,dy);}
  resetView():void {this.renderer.resetZoom();}
}
