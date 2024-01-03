/**
 * @file CGAnimatorController.js
 * @author xuyuan
 * @date 2021/10/14
 * @brief CGAnimatorController.js
 * @copyright Copyright (c) 2021, ByteDance Inc, All Rights Reserved
 */

const Amaz = effect.Amaz;
const {BaseNode} = require('./BaseNode');

class CGAnimatorController extends BaseNode {
  constructor() {
    super();
    this.component = null;
    this.animationList = new Array();
    this.animationSize = 0;
    this.currentClip = null;
    this.loops = 0;
    this.currentLoop = 0;
    this.infinity = false;
    this.errorConfig = false;
    this.stayLastFrame = false;
    this.finish = false;
    this.sys = null;
    this.state = '';
    this.chosenIndex = -1;
    this.haveRegisteredListener = false;
  }

  _updateEventListener(sys){
    this.haveRegisteredListener = sys.eventListener.haveRegistered(
      Amaz.AnimazEventType.ANIM_END, 
      this.currentClip, 
      sys.script,
      'onCallBack'
    )
    if(!this.haveRegisteredListener){
      this._registerEventListener(this.sys);
    }
    else if(this.chosenIndex != this.inputs[3]()){
      sys.eventListener.removeListener(sys.script, 
        Amaz.AnimazEventType.ANIM_END, 
        this.currentClip, 
        sys.script);
      this._registerEventListener(this.sys);
    }
  }

  _registerEventListener(sys) {
    this.component = this.inputs[2]();
    this.errorConfig = false;
    this.loops = this.inputs[4]();

    if (this.component == null || this.component.isInstanceOf('Animator') === false) {
      this.errorConfig = true;
      return;
    }
    if (this.loops === 0) {
      this.errorConfig = true;
      return;
    }
    if (this.loops === -1) {
      this.infinity = true;
    }
    this.stayLastFrame = this.inputs[5]();
    this.animationList = this.component.animations;
    this.animationSize = this.animationList.size();
    if (this.animationSize < 1) {
      this.errorConfig = true;
      return;
    }
    let prevClip = this.currentClip;
    this.chosenIndex = this.inputs[3]();
    if (this.chosenIndex >= this.animationSize || this.chosenIndex < 0) {
      this.errorConfig = true;
      return;
    }
    let chooseAnim = this.animationList.get(this.chosenIndex);
    if (!chooseAnim) {
      this.errorConfig = true;
      return;
    }
    this.currentClip = chooseAnim.getClip('', this.component);
    if (!this.currentClip) {
      this.errorConfig = true;
      return;
    }
    sys.eventListener.registerListener(sys.script, 
      Amaz.AnimazEventType.ANIM_END, 
      this.currentClip, 
      sys.script);
    this.haveRegisteredListener = true;
  }

  execute(index) {
    this.component = this.inputs[2]();
    this.stayLastFrame = this.inputs[5]();
    this.loops = this.inputs[4]();

    if(this.component){
      if(this.sys.autoResetEffect){
        if(this.sys.setterNodeInitValueMap && !this.sys.setterNodeGuidMap.has(this.component.guid.toString())){
          const callBackFuncMap = new Map();
          const runningWrapModeMap = this.component.runningWrapModes;
          const runningAnimazName = runningWrapModeMap.getVectorKeys().get(0);
          const runningAnimazWrapMode = runningWrapModeMap.get(runningAnimazName);
          const initialRunningAnimazClip = this.component.getClipByName(runningAnimazName);
          const clipPlaySpeed = initialRunningAnimazClip.getSpeed();
          
          callBackFuncMap.set(
            (_animatorComp, _initialClip, _wrapMode, _speed)=>{
              _animatorComp.stopAllAnimations();
              _animatorComp.schedule(_initialClip, _wrapMode, _speed);
            }, [initialRunningAnimazClip, runningAnimazWrapMode, clipPlaySpeed]);
          this.sys.setterNodeGuidMap.add(this.component.guid.toString());
          this.sys.setterNodeInitValueMap.set(this.component.guid, callBackFuncMap);
        }
      }

      if(this.component != null){
        this._updateEventListener(this.sys);
      }
      
      if (this.errorConfig) {
        if (this.nexts[0]) {
          this.nexts[0]();
        }
        return;
      }
  
      if (index === 0) {
        // Stop all the previous animations.
        this.component.stopAllAnimations();
        this.sys.animSeqNodes.forEach(node => {
          if(this.component && node.component && node.component.equals(this.component)){
            node.state = 'stop'
          }
        });
        this.finish = false;
        this.currentLoop = 0;

        let clipPlaySpeed = this.currentClip.getSpeed();
  
        if(this.chosenIndex != this.inputs[3]()){
          if(this.stayLastFrame){
            this.component.unschedule(this.currentClip);
          }
        }
  
        this.component.schedule(this.currentClip, 1, clipPlaySpeed);
        this.state = 'play';
  
        // replay if already start
        if (this.nexts[1]) {
          this.nexts[1]();
        }
      } else if (index === 1) {
        this.component.stopAllAnimations();
        this.state = 'stop';
        if (this.nexts[2]) {
          this.nexts[2]();
        }
      }
    }

    if (this.nexts[0]) {
      this.nexts[0]();
    }
  }

  beforeStart(sys) {
    this.sys = sys;
    sys.animSeqNodes.push(this);
  }

  onUpdate(dt){
    if(this.inputs[2]() != null){
      this._updateEventListener(this.sys);
    }
  }

  onCallBack(sys, clip, eventType) {
    if (eventType === Amaz.AnimazEventType.ANIM_END) {
      if (clip.equals(this.currentClip) && this.state !== 'stop' && this.state !== '') {
        this.currentLoop = this.currentLoop + 1;
        if (this.currentLoop >= this.loops && false === this.infinity) {
          this.component.unschedule(this.currentClip);
          this.finish = true;
          if(this.stayLastFrame){
            this.component.stopAllAnimations();
          }

          // need to remove listener every time upon finishing
          sys.eventListener.removeListener(sys.script, 
            Amaz.AnimazEventType.ANIM_END, 
            this.currentClip, 
            sys.script);
        } else {
          let clipPlaySpeed = this.currentClip.getSpeed();
          this.component.schedule(this.currentClip, 1, clipPlaySpeed);
        }
      }
    }
  }

  onLateUpdate(dt) {
    if (this.finish) {
      if (this.nexts[3]) {
        this.nexts[3]();
      }
      this.state = '';
      this.finish = false;
    }
  }

  onDestroy(sys) {}
}

exports.CGAnimatorController = CGAnimatorController;
