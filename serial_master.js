'use strict'

const events = require('events');
const cp = require('child_process');
const processModule = require("process");
const SERIAL_EVENTS = require('./serial_events.js');


var serial_worker = cp.fork('./serial_worker.js',{silent:false});



class SerialInterface extends events.EventEmitter {
    constructor(path,options,immediate,callback){
        super();
        let $ = this;
        let first = true

        $.reporter = new events.EventEmitter();

        serial_worker.on('message',(msg)=>{
            //console.log(msg);
            $.reporter.emit(msg.eventType,msg.body);
        });

        serial_worker.send({
            func: 'init',
            param: [path,options,immediate]
        });

        $.reporter.on(SERIAL_EVENTS.data,(data)=>{
            //console.log("data");
            if(data.type=="Buffer")
              data = new Buffer(data.data);
            $.emit("data",data);
        });
        $.reporter.on(SERIAL_EVENTS.open,()=>{
            if(first && callback){
                first = !first;
                callback();
            }
            $.emit("open");
        });
        $.reporter.on(SERIAL_EVENTS.close,()=>{
            $.emit("close");
        });
        $.reporter.on(SERIAL_EVENTS.error,(err)=>{
            //console.log(err);
            $.emit('error',new Error(err));
        });
    }

    static list(callback){
        let $ = this;
        serial_worker.send({func:"list",param:undefined});
        serial_worker.once('message',(msg)=>{
            if(msg.eventType === SERIAL_EVENTS.list_success){
                if(callback){
                    callback(undefined,msg.body);
                }
            }else if(msg.eventType === SERIAL_EVENTS.list_failed){
                if(callback){
                    callback(msg.body);
                }
            }
        });

        //serial_worker
    }

    open(callback){
        let $ = this;
        serial_worker.send({func:"open",param:undefined});
        $.reporter.once(SERIAL_EVENTS.open_success,()=>{
            $.reporter.removeAllListeners(SERIAL_EVENTS.open_failed);
            if(callback){
                callback();
            }
        });
        $.reporter.once(SERIAL_EVENTS.open_failed,(err)=>{
            $.reporter.removeAllListeners(SERIAL_EVENTS.open_success);
            if(callback){
                callback(new Error(err));
            }
        });
    }

    set(options, callback){
        let $ = this;
        serial_worker.send({func:"set",param:options});
        $.reporter.once(SERIAL_EVENTS.set_success,(result)=>{
            $.reporter.removeAllListeners(SERIAL_EVENTS.set_success);
            if(callback){
                callback(null, result);
            }
        });
        $.reporter.once(SERIAL_EVENTS.set_failed,(err)=>{
            $.reporter.removeAllListeners(SERIAL_EVENTS.set_failed);
            if(callback){
                callback(new Error(err));
            }
        });
    }

    pause(){
        //let $ = this;
        serial_worker.send({func:"pause",parm:undefined});
    }

    resume(){
        //let $ = this;
        serial_worker.send({func:"resume",parm:undefined});
    }

    write(buffer, callback){
        let $ = this;
        serial_worker.send({func:'write',param:buffer});
        $.reporter.once(SERIAL_EVENTS.write_success,()=>{
            //Clean Up the fail listener
            $.reporter.removeAllListeners(SERIAL_EVENTS.write_failed);
            if(callback){
                callback();
            }
        });
        $.reporter.once(SERIAL_EVENTS.write_failed,(err)=>{
            $.reporter.removeAllListeners(SERIAL_EVENTS.write_success);
            if(callback){
                callback(new Error(err));
            }
        });
    }

    flush(callback){
        let $ = this;
        serial_worker.send({func:'flush',param:undefined});

        $.reporter.once(SERIAL_EVENTS.flush_success,()=>{
            $.reporter.removeAllListeners(SERIAL_EVENTS.flush_failed);
            if(callback){
                callback();
            }
        });
        $.reporter.once(SERIAL_EVENTS.flush_failed,(err)=>{
            $.reporter.removeAllListeners(SERIAL_EVENTS.flush_success);
            if(callback){
                callback(new Error(err));
            }
        });
    }

    drain(callback){
        let $ = this;
        serial_worker.send({func:'drain',param:undefined});
        $.reporter.once(SERIAL_EVENTS.drain_success,()=>{
            $.reporter.removeAllListeners(SERIAL_EVENTS.drain_failed);
            if(callback){
                callback();
            }
        });
        $.reporter.once(SERIAL_EVENTS.drain_failed,(err)=>{
            $.reporter.removeAllListeners(SERIAL_EVENTS.drain_success);
            if(callback){
                callback(new Error(err));
            }
        });
    }

    isOpen(callback){
        let $ = this;
        serial_worker.send({func:'isOpen',param:undefined});
        $.reporter.once(SERIAL_EVENTS.is_open,(flag)=>{
            callback(flag)
        });
    }
    close(callback){
        let $ = this;
        serial_worker.send({func:"close",param:undefined});
        $.reporter.once(SERIAL_EVENTS.close_success,()=>{
            $.reporter.removeAllListeners(SERIAL_EVENTS.close_failed);
            if(callback){
                callback();
            }
        });
        $.reporter.once(SERIAL_EVENTS.close_failed,(err)=>{
            $.reporter.removeAllListeners(SERIAL_EVENTS.close_success);
            if(callback){
                callback(new Error(err));
            }
        });
    }



}




processModule.on('exit', function() {
    serial_worker.kill();
});

module.exports = SerialInterface;










//serial_interface.init().then(()=>{},(err)=>{console.log(err)});
