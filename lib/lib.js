//
// Misc library functions
//

let path=require('path');
const U=undefined;
module.exports={install: function(X){
	X.U=U;

	// Basic functions and helpers
	
	function impose(from, dest) {
		// take names from local environment
		// and set them on dest
		if(dest===U) dest='X.';
		if(typeof(from)=='string') {
			let nn=from.split(/ /);
			for(let i in nn) 
				if (t(nn[i])=='func') eval(dest+nn[i]+'='+nn[i]+'.bind(X)');
				else eval(dest+nn[i]+'='+nn[i]);
		}
	}
	impose('impose');
	function assert(cond,msg) { if(tfunc(cond)) cond = cond(); if (!cond) die(msg); }
	function blockup(n) { return Math.ceil((n++/X.vecSize)*2)*X.vecSize; }
	function die(reason) { console.log('Xacto died: ', reason); process.exit(1); return false; }
	function emit(x,label) { if (label) console.log(label,x); else console.log(x); return x; }
	function noemit(x,label) { return x; }
	function err(type, where, val) { throw `${type} error in ${where}: `+je(val) }
	function handler(fn,type) { // return handler by resolving fn, or by using 'type' (mutually exclusive)
		const ext=type!==X.U ? type : drop(path.extname(fn),1);
		return X.handlers[ext]||X.handlers['default'];
	} 
	function homefile(fn) { return path.join(X.home, fn); }
	function rand(max) { if (tarray(max)) return choice(max); else return Math.floor(Math.random() * max); } 
	function randN(max, n) { 
		let r=[], i;
		for (i=0;i<n;i++) r.push(rand(max));
		return r; }
	impose('assert blockup die emit noemit err');
	impose('handler homefile');
	impose('now rand');

	// encoding/decoding
	function je(x) { return JSON.stringify(x); } // json encode
	function jd(x) { return JSON.parse(x); }     // json encode
	function ud(x) { return decodeURIComponent(x); } 
	function ue(x) { return encodeURIComponent(x); } 
	function str(x) { 
		const tx=t(x);
		if (tx==='object' && has(x,'toString')) return x.toString();
		if (tbox(x)) return je(x);
		return x+'';
	}
	impose('je jd ud ue str');

	// general handlers for file types
	function imp(str,type,cb,opts) { return X.handler('',type).imp(str,cb,opts); }
	function exp(str,type,cb,opts) { return X.handler('',type).exp(str,cb,opts); }
	function load(fn,cb,opts) { return X.handler(fn).load(fn); } 
	function save(fn,x) { return X.handler(fn).save(fn,x); } 
	impose('imp exp load save');

	// date and time
	
	function hour(n) { return n * 60 * 60 * 1000; }
	function minute(n) { return n * 60 * 1000; }
	function second(n) { return n * 1000; }
	function now() { return Date.now(); } 
	function time(fn,n,label) { 
		if(n===U) n=1;
		const st=now(),sm=process.memoryUsage();
		for (let i=0; i<n; i++) { x=fn(i); } 
		const et=now(),em=process.memoryUsage();
		const memstat=each(em,function(v,k) { return mb(v-sm[k]); });
		const stat={iterations:n, out: x?x:U, time: et-st, periter: (et-st)/n, mem: memstat};
		return emit(stat, label||"time");
	}
	function mb(n) { return Math.ceil(n / (1024 * 1024)).toString() + "mb"; }
	impose('hour minute second time mb');

	// application and iteration functions

	/*
	function cases(val,caselist,elsefun,arga,argb,argc) {
		if(t(x)!='object') return err('type','cases',arguments);
		var k=Object.keys(caselist);
		var elsefun;
		for(var k in Object.keys(caselist)) {
			if(val==k) return caselist[k](val,arga,argb,argc);
		}
		return elsefun ? elsefun(val,arga,argb,argc) : undefined;
	}
	*/
	function deep(x,f,opts,path) {
		if(!path) path=[];
		const tx=t(x);
		opts=opts || {};
		if(opts.type!==X.U && opts.type===tx) return f(x,path,opts);
		else if(tx==='array' || tx==='object') return deep0(x,f,opts,path);
		return x;
	}
	function deep0(x,f,opts,path) {
		emit([x,path], 'deep0');
		const xk=key(x), xkl=xk.length;
		for(let i=0; i<xkl; i++) { 
			const k=xk[i], v=x[k], tv=t(v);
			emit([i,k,t(v),v],'deep0 inner [i,v]');
			if((opts.type!==X.U && tv===opts.type)
				  || (opts.key!==X.U && k==opts.key)) x[k]=f(v,ins(path,k),opts,x);
			else if (tv==='array' || tv==='object') x[k]=deep0(v,f,opts,ins(path,k));
			else if (opts.type===X.U) x[k]=f(v,ins(path,k),opts,x);
		}
		return x;
	}
	function eacharray(x,f,opts) {
		const xl=x.length, tf=t(f);
		let r=[], k, i;
		for(i=0; i<xl; i++) {
			if(tf==='string') r.push(x[i][f]);
			else r.push(f(x[i], i, opts, i));
		}
		return r;
	}
	function eachmap(x,f,opts) {
		let r={};
		for(let [k,v] of x.entries()) r[k]=f(x[k],k,opts);
		return r;
	}
	function eachobj(x,f,opts) {
		const xk=key(x), xkl=xk.length;
		let r={}, k, i;
		for(i=0; i<xkl; i++) {
			k=xk[i]; 
			r[k]=f(get(x,k),k,opts,i);
		}
		return r;
	}
	function each(x,f,opts) {
		const tx=t(x);
		if(tx==='array') return eacharray(x,f,opts);
		else if(tx==='object') {
			if(x instanceof Map) return eachmap(x,f,opts)
			if('each' in x) return x.each(f,opts);
			else return eachobj(x,f,opts);
		}
		else return err('type', 'each', x);
	}
	function compose(flist) {
		if(!tarray(flist)) return err('type', 'compose', flist);
		else return function(x) {
			for(let i=0;i<flist.length;i++) x=flist[i](x); 
			return x;
		}
	}
	function identity(x) { return x; }
	function proj(f, x, y, z) { // curry function f with args x, y, or z.
		if (x!==U&&y!==U&&z!==U) return function(a) { return f(x, y, z, a); }.bind(f)
		else if (x!==U&&y===U&&z===U) return function(a,b) { return f(x, a, b); }.bind(f)
		else if (x!==U&&y===U&&z!==U) return function(a,b) { return f(x, a, z); }.bind(f)
		else if (x===U&&y!==U&&z===U) return function(a,b) { return f(a, y, b); }.bind(f)
		else if (x===U&&y===U&&z!==U) return function(a,b) { return f(a, b, z); }.bind(f)
		else if (x!==U&&y!==U&&z===U) return function(a,b) { return f(x, y, r); }.bind(f)
		else return f;
	}
	impose('deep each compose identity proj');

	// manipulating values:
	
	function choice(list) { return get(list, rand(len(list))); } 
	function dict(keys, vals) {
		const k=key(keys), kl=k.length;
		let r={}, i;
		for(i=0; i<kl; i++) r[k[i]] = vals[i];
		return r;
	}
	function drop(x,n) { // TODO finish drop and make sure it works 100% with strings
		const	tx=t(x);
		if(n>=0) {
			if(tx==='string') return x.slice(n);
			else return get(x,range(n,len(x)));
		} else {
			return get(x,range(0,len(x)+n));
		}
		return err('nyi','drop neg');
	}
	function equal(x,y) { //emit([x,y],'equal');
		if (typeof(x)!==typeof(y)) return false;
		if (Array.isArray(x) && Array.isArray(y) && x.length!=y.length) return false;
		if (typeof(x)!=='object' && x==y) return true; //simple values - hopefully
		return JSON.stringify(x)==JSON.stringify(y); }
	function first(x) { return head(x); }
	function fliparray(x) {
		const xl=x.length, f=first(x), fl=f.length;
		let r=[], i, j, v;
		for(let i=0; i<fl; i++) r.push([]);
		for(let i=0; i<xl; i++) {
			let v=x[i];
			for(let j=0; j<fl; j++) r[j].push(v[j]);
		}
		return r;
	}
	function flipobj(x) {
		const f=x[first(key(x))];
		if(t(f)!='array') throw err('type','flip values should be array');
		const xk=Object.keys(x), len=f.length; 
		delete f;
		let r=new Array(len), ki, i;
		for(i=0; i<len; i++) {
			r[i]={};
			for(ki in xk) {
				let kk=xk[ki]; 
				r[i][kk]=x[kk][i];
			} 
		}
		return r;
	}
	function flip(x) {
		const tx=t(x);
		if(tx==='array') return fliparray(x);
		else if(tx==='object') return flipobj(x);
	}
	function get(x, idx) {
		if(tarray(idx)) return geta(x,idx);
		else {
			const tx=t(x); 
			if(tx==='object'&&'get' in x) return x.get(idx);
			if(tx==='array'||tx==='object') return get1(x,idx);
			return err('type','get',x);
		}
	}
	function get1(x, idx) { return x[idx]; }
	function geta(x, idx) {
		let i,r=[]; const tx=t(x), ilen=idx.length;
		if(t(x)==='object'&&'get' in x) 
			for(i=0;i<ilen;i++) r.push(x.get(idx[i]));
		else
			for(i=0;i<ilen;i++) r.push(get1(x, idx[i]));
		if(tx=='string') return r.join('');
		else return r;
	}
	function has(x,y) {
		const tx=t(x);
		if (tx==='object') {
			if (y in key(x)) return true;
		}
		return member(x,y);
	}
	function head(x) { return get(x,0); }
	function inter(x, y) {
		let t
		if (y.length > x.length) t=y,y=x,x=t; // indexOf to loop over shorter
		const xl=x.length, yl=y.length;
		const yIncl=y.includes.bind(y);
		let i, j, r=new Set();
		for (i=0; i<xl; i++) {
			if (yIncl(x[i])) r.add(x[i]);
		}
		return Array.from(r);
	}
	function join(x,y) { 
		if(tarray(x)) { x.push(y); return x; }
		else return err('type','join');
	}
	function key(x) { 
		const tx=t(x); 
		if(tx==='array') return range(0,x.length); 
		else if (tx==='object') {
			if ('keys' in x) return Array.from(x.keys());
			else if ('key' in x) return x.key();
			else return Object.keys(x);
		}
		return err('type','keys',x);
	}
	function len(x) { 
		const tx=typeof(x);
		if (tx==='string') return x.length;
		else if (tx==='object') {
			if ('len' in x) return x.len();
			else if ('length' in x) return x.length;
			else return Object.keys(x).length;
		} else return err('arg','len',x);
	}
	function last(x) { return tail(x); }
	function max(min,max) { return Math.max(min,max); }
	function member(container,item) { 
		const tx=t(container);
		if(tx==='string' || tx==='array') return container.includes(item); 
		return err('type', 'member', container);
	} 
	function min(min,max) { return Math.min(min,max); }
	function range(min,max,func) {
		let r=[],i;
		for(i=min;i<max;i++) r.push(func?func(i):i);
		return r;
	}
	function sum(x,nullvalue) {
		if(!tarray(x)) return err('nyi',sum,'only arrays for now');
		const xl=x.length; let r=0, i;
		if (nullvalue===X.U) for(i=0;i<xl;i++) r+=x[i];
		else for(i=0;i<xl;i++) {
				let n=x[i], pf;
				r+= (!isNaN(pf=parseFloat(n))&&isFinite(n)) ? pf : nullvalue; // try eyewash after reading the following diabolical utterance
		}
		return r;
	}
	function take(x,n) { 
		const tn=t(n), xl=len(x);
		if(tn=='int') {
			if (n>=0) return get(x,range(0,min(n,xl)));
			else return get(x,range(xl+n,xl));
		}
		return err('arg','take',n);
	}
	function tail(x) {
		return get(x,len(x)-1);
	}
	impose('choice dict drop equal first flip');
	impose('has head get inter key last len');
	impose('max member min range sum tail take');

	// sorting:

	function sort(retcodes, vals, key) {
		let tv=t(vals);
		if (tv==='array' && key) {
			return vals.sort(function(a,b) {
				const ak=a[key], bk=b[key];
				return ak==bk ? 0 : (ak < bk ? retcodes[0] : retcodes[1]);
			});
		}
		return err('nyi', 'desc');
	}
	function asc(vals, key) {
		return sort([-1, 1], vals, key);
	}
	function desc(vals, key) {
		return sort([1, -1], vals, key);
	}
	impose('asc desc');

	// types:
	
	function t(x) { 
		if (x===U) return 'undef';
		else if (Array.isArray(x)) return 'array';
		const t=typeof(x);	
		if (t==='number' && Math.floor(x)==x) return 'int'; // lame
		else if (t==='number') return 'float'; // lame
		else if (t==='function') return 'func';
		return t; // fall thru
	}
	function tarray(x) { return Array.isArray(x); }
	function tbox(x) { return typeof(x)==='object' || Array.isArray(x); }
	function tdict(x) { return typeof(x)==='object' && !Array.isArray(x); }
	function tfunc(x) { return typeof(x)==='function'; }
	impose('t tarray tbox tdict tfunc');

	// flexibly resolving symbols in the X dictionary 
	
	function lookup(name) {
		if(t(name)==='func') return name;
		if(t(name)==='string') if(name in X) return X[name];
		return U;
	}
	function lookupdie(name,where) {
		let r=lookup(name);
		if(r===U) throw err('key','lookup.'+where,name);
		else return r;
	}
	impose('lookup lookupdie');
	
	// high level functions:
	
	function ins0(col, x) {
		const tc=t(col);
		if (tc==='array') return col.push(x), col;
		else if (col in X.tbl) return X.tbl[col].ins(x); 
		else if (tc==='object') {
			if('ins' in col && tfunc(col.ins)) return col.ins(x); 
			else if (tdict(x)) { 
				for(let k in x) col[k]=x[k]; 
				return col;
			}
		}
		else return err('arg','ins',col);
	}
	function ins(col, x) {
		//console.log(this);
		if (x===X.U) return function(value) { return ins0(col, value); };
		else return ins0(col, x);
	}
	X.ins=ins;

	function sel(col, x) {
		if (col in X.tbl) return X.tbl[col].ins(x); 
		const tc=t(col);
		// ugh must we really generalize all that garbage from backend.js?
		if(tc==='object') {
			if('sel' in col && t(col.ins)==='func') return col.sel(x); 
		}
		return get(col, where(col, x));
	}
	X.sel=sel;

	function updArray(col, i, x) {
		const ilen=i.length;
		for(let ii=0;ii<ilen;ii++) col[i[ii]]=x[ii];
		return col;
	}
	function updObj(col, i, x) {
		let k=key(i), kl=k.length, ii;
		for(ii=0; ii<kl; ii++) col[i[ii]] = x[k[ii]];
		return col;
	}
	function upd(col, i, x) {
		if(!tbox(i)) { i=[i], x=[x]; }
		const tcol=t(col);
		if (col in X.tbl) return X.tbl[col].upd(i, x); 
		else if (tcol==='array') return updArray(col, i, x);
		else if (tcol==='object') {
			if('upd' in col) return col.upd(i,x);
			else return updObj(col, i, x);
		}
		else return err('arg','ins',t);
	}
	X.upd=upd;

	function whereFunc(col, x) {
		let cl=len(col), r=[], ci;
		for(ci=0; ci<cl; ci++) if(x(col[ci], ci)===true) r.push(ci);
		return r;
	}
	function whereVal(col, x) {
		let cl=len(col), r=[], ci;
		if(x===X.U) return range(0,cl);
		if(typeof(x)==='object') for(ci=0; ci<cl; ci++) { if(equal(col[ci],x)===true) r.push(ci); }
		else for(ci=0; ci<cl; ci++) { if(col[ci]==x) r.push(ci); }
		return r;
	}
	function where(col, x) {
		if (col in X.tbl) return X.tbl[col].where(x); 
		const tc=t(col);
		if(tc==='object' && 'where' in col) return col.where(x); 
		// ugh must we really generalize all that garbage from backend.js?
		if (tarray(col)) {
			const tx=t(x);
			if(tx==='func') return whereFunc(col,x);
			else return whereVal(col,x);
		} else 
			return err('arg','where',col);
	}
	X.where=where;

	impose('ins sel upd');	
	return X;
}}
