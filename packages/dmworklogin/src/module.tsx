
import {WKApp} from '@octo/base'
import { IModule } from '@octo/base'
import React from 'react'
import Login from './login'
export default  class LoginModule implements IModule {

    id(): string {
        return "LoginModule"
    }
    init(): void {
        WKApp.route.register("/login",(param:any):JSX.Element =>{
            return <Login />
        })
    }
}