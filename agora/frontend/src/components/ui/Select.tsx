import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type KeyboardEvent } from 'react';

interface OptionProps { value: string; children: ReactNode; disabled?: boolean; }
function optionText(children:ReactNode):string {
 return Children.toArray(children).map(child=>typeof child==='string' || typeof child==='number'?String(child):isValidElement<{children?:ReactNode}>(child)?optionText(child.props.children):'').join('');
}
interface SelectProps {
 label: string; name?: string; value?: string; defaultValue?: string; onValueChange?: (value: string) => void;
 children: ReactNode; disabled?: boolean; className?: string;
}
export function Select({label,name,value,defaultValue,onValueChange,children,disabled=false,className=''}: SelectProps) {
 const id=useId();
 const options=Children.toArray(children).filter(isValidElement<OptionProps>).map(option=>option.props);
 const [internal,setInternal]=useState(defaultValue ?? options[0]?.value ?? '');
 const selectedValue=value ?? internal;
 const selected=options.find(option=>option.value===selectedValue) ?? options[0];
 const [open,setOpen]=useState(false),[active,setActive]=useState(0);
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null);
 const search=useRef({text:'',at:0});
 const selectedIndex=Math.max(0,options.findIndex(option=>option.value===selected?.value));
 function show(index=selectedIndex) {
  if(disabled || !options.length || trigger.current?.matches(':disabled'))return;
  setActive(index);setOpen(true);
 }
 function close(restore=false) {setOpen(false);search.current.text='';if(restore)trigger.current?.focus();}
 function choose(index:number) {
  const option=options[index];if(disabled || trigger.current?.matches(':disabled') || !option || option.disabled)return;
  if(value===undefined)setInternal(option.value);
  close(true);onValueChange?.(option.value);
 }
 useEffect(()=>{
  const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
  if(open)document.addEventListener('pointerdown',outside);
  return ()=>document.removeEventListener('pointerdown',outside);
 },[open]);
 useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
 useEffect(()=>{
  const form=trigger.current?.closest('form');
  const reset=()=>{if(value===undefined)setInternal(defaultValue ?? options[0]?.value ?? '');setOpen(false);};
  form?.addEventListener('reset',reset);return ()=>form?.removeEventListener('reset',reset);
 },[value,defaultValue,options[0]?.value]);
 useLayoutEffect(()=>{
  if(!open || !menu.current || !trigger.current)return;
  const node=menu.current,button=trigger.current;
  function position() {
   const bounds=button.getBoundingClientRect(),viewport=window.visualViewport;
   const viewportTop=viewport?.offsetTop ?? 0,viewportHeight=viewport?.height ?? innerHeight;
   const below=viewportTop+viewportHeight-bounds.bottom-8,above=bounds.top-viewportTop-8;
   const desired=Math.min(options.length*44+14,280),down=below>=desired || below>=above;
   const height=Math.min(desired,Math.max(0,down?below:above));
   Object.assign(node.style,{width:Math.min(bounds.width,innerWidth-16)+'px',left:Math.max(8,Math.min(bounds.left,innerWidth-bounds.width-8))+'px',top:(down?bounds.bottom+6:bounds.top-6-height)+'px',maxHeight:height+'px'});
   node.dataset.placement=down?'bottom':'top';
  }
  position();
  // A native top-layer popover escapes both the hero's clipping and modal scroll areas.
  if(typeof node.showPopover==='function'){node.setAttribute('popover','manual');node.showPopover();}
  const resize=new ResizeObserver(position);resize.observe(button);
  window.addEventListener('resize',position);window.addEventListener('scroll',position,true);
  window.visualViewport?.addEventListener('resize',position);
  return ()=>{
   resize.disconnect();window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);
   window.visualViewport?.removeEventListener('resize',position);
   if(typeof node.hidePopover==='function' && node.matches(':popover-open'))node.hidePopover();
  };
 },[open,options.length]);
 useLayoutEffect(()=>{
  if(open){const option=menu.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[active];option?.focus({preventScroll:true});option?.scrollIntoView({block:'nearest'});}
 },[open,active]);
 function keyDown(event:KeyboardEvent<HTMLDivElement>) {
  if(disabled || trigger.current?.matches(':disabled'))return;
  if(event.key==='Escape' && open){event.preventDefault();event.stopPropagation();close(true);return;}
  if(event.key==='Tab' && open){close(true);return;}
  const enabled=options.map((option,index)=>option.disabled?-1:index).filter(index=>index>=0);
  if(!enabled.length)return;
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
   event.preventDefault();event.stopPropagation();
   if(event.key==='Home'){show(enabled[0]);return;}
   if(event.key==='End'){show(enabled[enabled.length-1]);return;}
   if(!open){show(options[selectedIndex]?.disabled?enabled[0]:selectedIndex);return;}
   const current=enabled.indexOf(active),next=(current+(event.key==='ArrowDown'?1:-1)+enabled.length)%enabled.length;
   setActive(enabled[next]!);return;
  }
  if(event.key.length===1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key!==' ') {
   event.preventDefault();const now=Date.now();
   const text=(now-search.current.at<700?search.current.text:'')+event.key.toLocaleLowerCase();
   search.current={text,at:now};
   const needle=[...text].every(char=>char===text[0])?text[0]!:text;
   const ordered=[...enabled.filter(index=>index>(open?active:-1)),...enabled.filter(index=>index<=(open?active:-1))];
   const match=ordered.find(index=>optionText(options[index]?.children).toLocaleLowerCase().startsWith(needle));
   if(match!==undefined)show(match);
  }
 }
 return <div ref={root} className={'field custom-select '+className} onKeyDown={keyDown}
  onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setOpen(false);}}>
  <label id={id+'-label'} htmlFor={id}>{label}</label>
  {name && <input type="hidden" name={name} value={selected?.value ?? ''} disabled={disabled}/>}
  <button id={id} ref={trigger} type="button" className="select-trigger" disabled={disabled || !options.length}
   aria-labelledby={id+'-label '+id+'-value'} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id+'-options':undefined}
   onClick={()=>open?close():show()}><span id={id+'-value'}>{selected?.children}</span><span aria-hidden="true" className="select-chevron"/></button>
  {open && <div id={id+'-options'} ref={menu} className="select-options" role="listbox" aria-labelledby={id+'-label'}>
   {options.map((option,index)=><button id={id+'-option-'+index} key={option.value} type="button" role="option" tabIndex={-1}
    disabled={option.disabled} aria-selected={selected?.value===option.value} onFocus={()=>setActive(index)} onClick={()=>choose(index)}>
    <span>{option.children}</span><span className="select-check" aria-hidden="true"/>
   </button>)}
  </div>}
 </div>;
}
